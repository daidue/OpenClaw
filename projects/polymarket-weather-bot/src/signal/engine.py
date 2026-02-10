"""Signal generation engine - compares NOAA vs Polymarket to find edges"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from ..models import (
    NOAAForecast,
    PolymarketMarket,
    TradingSignal,
    TradeDirection,
    ConfidenceLevel,
    BotConfig,
)
from .scoring import ConfidenceScorer

logger = logging.getLogger(__name__)


class SignalEngine:
    """Generate trading signals by comparing NOAA forecasts with Polymarket prices"""
    
    def __init__(self, config: BotConfig):
        self.config = config
        self.scorer = ConfidenceScorer()
    
    def generate_signals(
        self,
        forecasts: List[NOAAForecast],
        markets: List[PolymarketMarket],
    ) -> List[TradingSignal]:
        """
        Generate trading signals by matching forecasts to markets.
        
        Args:
            forecasts: NOAA forecasts for various cities/dates
            markets: Active Polymarket weather markets
        
        Returns:
            List of TradingSignal objects with edge > threshold
        """
        signals = []
        
        for market in markets:
            # Find matching forecast
            forecast = self._find_matching_forecast(market, forecasts)
            
            if not forecast:
                logger.debug(f"No matching forecast for market: {market.question}")
                continue
            
            # Generate signal
            signal = self._generate_signal_for_pair(forecast, market)
            
            if signal:
                signals.append(signal)
        
        # Sort by expected value (best opportunities first)
        signals.sort(key=lambda s: s.expected_value, reverse=True)
        
        logger.info(f"Generated {len(signals)} signals from {len(markets)} markets")
        return signals
    
    def _find_matching_forecast(
        self,
        market: PolymarketMarket,
        forecasts: List[NOAAForecast]
    ) -> Optional[NOAAForecast]:
        """Find NOAA forecast matching the market"""
        market_city = market.city.lower()
        market_date = market.date.date()
        
        for forecast in forecasts:
            forecast_city = forecast.city.lower()
            forecast_date = forecast.forecast_date.date()
            
            # Match city and date
            if forecast_city == market_city and forecast_date == market_date:
                return forecast
        
        return None
    
    def _generate_signal_for_pair(
        self,
        forecast: NOAAForecast,
        market: PolymarketMarket
    ) -> Optional[TradingSignal]:
        """
        Generate trading signal for forecast + market pair.
        
        Compares NOAA probability vs market probability to find edge.
        """
        from ..models import MarketType
        
        # Calculate NOAA-implied probability
        noaa_prob = self._calculate_noaa_probability(forecast, market)
        
        if noaa_prob is None:
            logger.debug(f"Could not calculate NOAA probability for {market.question}")
            return None
        
        # Market-implied probability
        market_prob = market.market_implied_probability
        
        # Calculate edge (NOAA - Market)
        edge = noaa_prob - market_prob
        
        # Only generate signals when edge exceeds threshold
        if abs(edge) < self.config.minimum_edge_threshold:
            logger.debug(
                f"Edge too small for {market.city}: {edge:.2%} "
                f"(threshold: {self.config.minimum_edge_threshold:.2%})"
            )
            return None
        
        # Determine direction
        if edge > 0:
            # NOAA says higher probability than market → BUY YES
            direction = TradeDirection.BUY
        else:
            # NOAA says lower probability than market → BUY NO (or SELL YES)
            direction = TradeDirection.SELL
            edge = abs(edge)  # Make edge positive for consistency
        
        # Score confidence
        confidence_score = self.scorer.calculate_confidence(
            forecast=forecast,
            market=market,
            edge=edge
        )
        
        if confidence_score < self.config.minimum_confidence_score:
            logger.debug(
                f"Confidence too low for {market.city}: {confidence_score:.2f} "
                f"(threshold: {self.config.minimum_confidence_score:.2f})"
            )
            return None
        
        # Map confidence score to level
        confidence_level = self._score_to_level(confidence_score)
        
        # Calculate position sizing using Kelly Criterion
        recommended_size = self._calculate_position_size(
            edge=edge,
            confidence=confidence_score,
            market_price=float(market.yes_price if direction == TradeDirection.BUY else market.no_price)
        )
        
        # Calculate expected value
        win_prob = noaa_prob if direction == TradeDirection.BUY else (1 - noaa_prob)
        entry_price = float(market.yes_price if direction == TradeDirection.BUY else market.no_price)
        expected_value = (win_prob * (1.0 - entry_price)) - ((1 - win_prob) * entry_price)
        
        # Build reasoning
        reasoning = self._build_reasoning(
            forecast=forecast,
            market=market,
            noaa_prob=noaa_prob,
            market_prob=market_prob,
            edge=edge,
            direction=direction
        )
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors(forecast, market, edge)
        
        return TradingSignal(
            signal_id=f"signal_{uuid.uuid4().hex[:8]}",
            generated_at=datetime.now(),
            market=market,
            noaa_forecast=forecast,
            direction=direction,
            noaa_probability=noaa_prob,
            market_probability=market_prob,
            edge=edge,
            confidence=confidence_level,
            confidence_score=confidence_score,
            recommended_position_size=recommended_size,
            expected_value=expected_value,
            reasoning=reasoning,
            risk_factors=risk_factors,
        )
    
    def _calculate_noaa_probability(
        self,
        forecast: NOAAForecast,
        market: PolymarketMarket
    ) -> Optional[float]:
        """
        Calculate NOAA-implied probability for market outcome.
        
        For binary markets like "Will NYC high exceed 50°F?", calculate
        probability based on NOAA's predicted temperature distribution.
        """
        from ..models import MarketType
        
        if market.market_type == MarketType.HIGH_TEMP:
            if forecast.high_temp is None:
                return None
            
            predicted_temp = forecast.high_temp
            confidence = forecast.high_temp_confidence or 0.7
            
            # If market has threshold (e.g., "exceed 50°F")
            if market.temp_threshold is not None:
                # Calculate probability temp exceeds threshold
                # Using normal distribution with std_dev based on confidence
                std_dev = 3.0 * (1.0 - confidence) + 1.0
                
                prob_exceeds = self._prob_above_threshold(
                    predicted_temp,
                    market.temp_threshold,
                    std_dev
                )
                return prob_exceeds
            
            # If market has range (e.g., "50-52°F")
            elif market.temp_range_low is not None and market.temp_range_high is not None:
                # Calculate probability temp falls in range
                std_dev = 3.0 * (1.0 - confidence) + 1.0
                
                prob_in_range = self._prob_in_range(
                    predicted_temp,
                    market.temp_range_low,
                    market.temp_range_high,
                    std_dev
                )
                return prob_in_range
            
            else:
                # No threshold/range - can't calculate probability
                logger.warning(f"Market has no threshold or range: {market.question}")
                return None
        
        elif market.market_type == MarketType.LOW_TEMP:
            # Similar logic for low temp
            if forecast.low_temp is None:
                return None
            
            predicted_temp = forecast.low_temp
            confidence = forecast.low_temp_confidence or 0.7
            
            if market.temp_threshold is not None:
                std_dev = 3.0 * (1.0 - confidence) + 1.0
                prob_below = self._prob_below_threshold(
                    predicted_temp,
                    market.temp_threshold,
                    std_dev
                )
                return prob_below
            
            return None
        
        elif market.market_type == MarketType.PRECIPITATION:
            if forecast.precipitation_probability is None:
                return None
            
            # Direct probability from NOAA
            return forecast.precipitation_probability
        
        else:
            logger.debug(f"Unsupported market type: {market.market_type}")
            return None
    
    @staticmethod
    def _prob_above_threshold(mean: float, threshold: float, std_dev: float) -> float:
        """Calculate probability value exceeds threshold (normal distribution)"""
        import math
        z = (threshold - mean) / (std_dev * math.sqrt(2))
        return 0.5 * (1 - math.erf(z))
    
    @staticmethod
    def _prob_below_threshold(mean: float, threshold: float, std_dev: float) -> float:
        """Calculate probability value is below threshold"""
        import math
        z = (threshold - mean) / (std_dev * math.sqrt(2))
        return 0.5 * (1 + math.erf(z))
    
    @staticmethod
    def _prob_in_range(mean: float, low: float, high: float, std_dev: float) -> float:
        """Calculate probability value falls in range [low, high]"""
        import math
        
        def normal_cdf(x):
            z = (x - mean) / (std_dev * math.sqrt(2))
            return 0.5 * (1 + math.erf(z))
        
        return normal_cdf(high) - normal_cdf(low)
    
    def _score_to_level(self, score: float) -> ConfidenceLevel:
        """Map confidence score (0-1) to confidence level"""
        if score >= 0.85:
            return ConfidenceLevel.VERY_HIGH
        elif score >= 0.75:
            return ConfidenceLevel.HIGH
        elif score >= 0.60:
            return ConfidenceLevel.MEDIUM
        elif score >= 0.45:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _calculate_position_size(
        self,
        edge: float,
        confidence: float,
        market_price: float
    ) -> Decimal:
        """
        Calculate position size using fractional Kelly Criterion.
        
        Kelly formula: f = (edge) / (odds - 1)
        We use fractional Kelly (config.kelly_fraction) for safety
        """
        # Kelly criterion
        # edge = win_prob - (1 - win_prob) / odds
        # Simplified: f = edge / variance
        
        # For binary markets, simplified Kelly:
        # f = (p * b - q) / b
        # where p = win probability, q = 1-p, b = odds (payoff ratio)
        
        if market_price >= 1.0 or market_price <= 0:
            return self.config.max_position_size_dollars
        
        # Odds (how much you win per $1 bet)
        odds = (1.0 - market_price) / market_price
        
        # Kelly fraction
        kelly_fraction = edge / odds if odds > 0 else 0
        
        # Apply fractional Kelly for safety
        kelly_fraction *= self.config.kelly_fraction
        
        # Scale by confidence
        kelly_fraction *= confidence
        
        # Convert to dollar amount
        # Assuming starting capital = max_daily_exposure
        capital = float(self.config.max_daily_exposure_dollars)
        position_size = capital * kelly_fraction
        
        # Cap at max position size
        position_size = min(position_size, float(self.config.max_position_size_dollars))
        
        # Floor at $10 minimum
        position_size = max(position_size, 10.0)
        
        return Decimal(str(round(position_size, 2)))
    
    def _build_reasoning(
        self,
        forecast: NOAAForecast,
        market: PolymarketMarket,
        noaa_prob: float,
        market_prob: float,
        edge: float,
        direction: TradeDirection
    ) -> str:
        """Build human-readable reasoning for signal"""
        reasoning_parts = [
            f"📍 {market.city} on {market.date.strftime('%B %d, %Y')}",
            f"🌡️  NOAA predicts high: {forecast.high_temp:.1f}°F (confidence: {forecast.high_temp_confidence:.0%})",
            f"📊 NOAA probability: {noaa_prob:.1%}",
            f"💰 Market price: {market_prob:.1%}",
            f"📈 Edge: {edge:.1%}",
            f"⚡ Recommendation: {direction.value.upper()} at {market.yes_price if direction == TradeDirection.BUY else market.no_price}",
            f"⏰ Forecast horizon: {forecast.forecast_horizon_hours}h",
        ]
        
        return " | ".join(reasoning_parts)
    
    def _identify_risk_factors(
        self,
        forecast: NOAAForecast,
        market: PolymarketMarket,
        edge: float
    ) -> List[str]:
        """Identify risk factors for this signal"""
        risks = []
        
        # Long forecast horizon = higher uncertainty
        if forecast.forecast_horizon_hours > 120:  # 5 days
            risks.append("Long forecast horizon (>5 days) - higher uncertainty")
        
        # Low confidence from NOAA
        if forecast.high_temp_confidence and forecast.high_temp_confidence < 0.7:
            risks.append("Low NOAA confidence score")
        
        # Low liquidity
        if market.liquidity < 5000:
            risks.append("Low market liquidity - may have slippage")
        
        # Small edge
        if edge < 0.15:
            risks.append("Small edge - vulnerable to market movement")
        
        # Close to market close
        if market.closes_at:
            hours_to_close = (market.closes_at - datetime.now()).total_seconds() / 3600
            if hours_to_close < 24:
                risks.append("Market closing soon - limited time to exit")
        
        return risks
