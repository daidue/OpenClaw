"""Confidence scoring for trading signals"""

import logging
from typing import Optional
from ..models import NOAAForecast, PolymarketMarket

logger = logging.getLogger(__name__)


class ConfidenceScorer:
    """Calculate confidence scores for trading signals"""
    
    # Weighting factors for confidence components
    WEIGHT_FORECAST_CONFIDENCE = 0.35  # NOAA's own confidence
    WEIGHT_FORECAST_HORIZON = 0.25  # How far ahead (closer = better)
    WEIGHT_MARKET_LIQUIDITY = 0.20  # Can we actually trade this?
    WEIGHT_EDGE_SIZE = 0.20  # Larger edge = more confident
    
    def calculate_confidence(
        self,
        forecast: NOAAForecast,
        market: PolymarketMarket,
        edge: float
    ) -> float:
        """
        Calculate overall confidence score (0-1) for a signal.
        
        Components:
        1. NOAA forecast confidence (how confident is NOAA?)
        2. Forecast horizon (how far ahead? closer = better)
        3. Market liquidity (can we execute?)
        4. Edge size (bigger edge = more conviction)
        
        Returns:
            Score from 0.0 to 1.0
        """
        # Component 1: NOAA confidence
        noaa_score = self._score_noaa_confidence(forecast)
        
        # Component 2: Forecast horizon
        horizon_score = self._score_forecast_horizon(forecast)
        
        # Component 3: Market liquidity
        liquidity_score = self._score_market_liquidity(market)
        
        # Component 4: Edge size
        edge_score = self._score_edge(edge)
        
        # Weighted combination
        total_score = (
            noaa_score * self.WEIGHT_FORECAST_CONFIDENCE +
            horizon_score * self.WEIGHT_FORECAST_HORIZON +
            liquidity_score * self.WEIGHT_MARKET_LIQUIDITY +
            edge_score * self.WEIGHT_EDGE_SIZE
        )
        
        # Ensure 0-1 range
        total_score = max(0.0, min(1.0, total_score))
        
        logger.debug(
            f"Confidence breakdown: "
            f"NOAA={noaa_score:.2f}, "
            f"Horizon={horizon_score:.2f}, "
            f"Liquidity={liquidity_score:.2f}, "
            f"Edge={edge_score:.2f} "
            f"→ Total={total_score:.2f}"
        )
        
        return total_score
    
    def _score_noaa_confidence(self, forecast: NOAAForecast) -> float:
        """
        Score based on NOAA's own confidence.
        
        NOAA confidence is already 0-1, use directly
        """
        if forecast.high_temp_confidence is not None:
            return forecast.high_temp_confidence
        elif forecast.low_temp_confidence is not None:
            return forecast.low_temp_confidence
        else:
            # Default moderate confidence
            return 0.7
    
    def _score_forecast_horizon(self, forecast: NOAAForecast) -> float:
        """
        Score based on forecast horizon.
        
        Closer forecasts are more accurate:
        - 0-24h: 1.0 (excellent)
        - 24-48h: 0.9 (very good)
        - 48-72h: 0.8 (good)
        - 72-120h: 0.6 (okay)
        - 120h+: 0.4-0.5 (poor)
        """
        hours = forecast.forecast_horizon_hours
        
        if hours < 0:
            # Historical (past) - perfect knowledge
            return 1.0
        elif hours <= 24:
            return 1.0
        elif hours <= 48:
            return 0.9
        elif hours <= 72:
            return 0.8
        elif hours <= 120:
            # Linear decay 72h→120h: 0.8→0.6
            return 0.8 - ((hours - 72) / 48) * 0.2
        else:
            # Further decay 120h→240h: 0.6→0.4
            return max(0.4, 0.6 - ((hours - 120) / 120) * 0.2)
    
    def _score_market_liquidity(self, market: PolymarketMarket) -> float:
        """
        Score based on market liquidity.
        
        More liquidity = better execution, less slippage
        
        Thresholds:
        - $50K+: 1.0 (excellent)
        - $20K-$50K: 0.9 (very good)
        - $10K-$20K: 0.8 (good)
        - $5K-$10K: 0.7 (okay)
        - $2K-$5K: 0.6 (marginal)
        - $1K-$2K: 0.5 (poor)
        - <$1K: 0.3 (very poor)
        """
        liquidity = float(market.liquidity)
        
        if liquidity >= 50_000:
            return 1.0
        elif liquidity >= 20_000:
            return 0.9
        elif liquidity >= 10_000:
            return 0.8
        elif liquidity >= 5_000:
            return 0.7
        elif liquidity >= 2_000:
            return 0.6
        elif liquidity >= 1_000:
            return 0.5
        else:
            return 0.3
    
    def _score_edge(self, edge: float) -> float:
        """
        Score based on edge size.
        
        Larger edge = more conviction
        
        Thresholds:
        - 30%+: 1.0 (massive edge)
        - 20-30%: 0.9 (large edge)
        - 15-20%: 0.8 (solid edge)
        - 10-15%: 0.7 (decent edge)
        - 5-10%: 0.5 (small edge)
        - <5%: 0.3 (tiny edge)
        """
        if edge >= 0.30:
            return 1.0
        elif edge >= 0.20:
            return 0.9
        elif edge >= 0.15:
            return 0.8
        elif edge >= 0.10:
            return 0.7
        elif edge >= 0.05:
            # Linear 5%→10%: 0.3→0.7
            return 0.3 + ((edge - 0.05) / 0.05) * 0.4
        else:
            return 0.3
