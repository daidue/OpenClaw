"""Generate mock Polymarket weather markets for sandbox testing"""

import logging
import random
from datetime import datetime, timezone
from decimal import Decimal
from typing import List
from ..models import PolymarketMarket, MarketType, TemperatureUnit, NOAAForecast

logger = logging.getLogger(__name__)


class MockMarketGenerator:
    """Generate realistic mock weather markets based on NOAA forecasts"""
    
    @staticmethod
    def generate_from_forecasts(forecasts: List[NOAAForecast]) -> List[PolymarketMarket]:
        """
        Generate mock markets from NOAA forecasts.
        
        Creates temperature threshold markets with intentional mispricings for testing.
        """
        mock_markets = []
        
        for forecast in forecasts:
            if forecast.high_temp is None:
                continue
            
            # Generate 1-2 markets per city
            num_markets = random.randint(1, 2)
            
            for i in range(num_markets):
                market = MockMarketGenerator._generate_temp_market(forecast, i)
                if market:
                    mock_markets.append(market)
        
        logger.info(f"🧪 Generated {len(mock_markets)} mock weather markets for sandbox testing")
        return mock_markets
    
    @staticmethod
    def _generate_temp_market(forecast: NOAAForecast, market_num: int) -> PolymarketMarket:
        """Generate a single temperature threshold market"""
        
        # Create threshold around forecast (±2-5 degrees)
        offset = random.uniform(2, 5) * random.choice([-1, 1])
        threshold = round(forecast.high_temp + offset)
        
        # Calculate "true" probability based on forecast
        # If threshold is below forecast, YES is more likely
        temp_diff = threshold - forecast.high_temp
        
        # Simple model: within ±3°F = coin flip, outside = more certain
        if abs(temp_diff) <= 3:
            true_prob = 0.5
        elif temp_diff < 0:  # threshold < forecast, YES likely
            true_prob = 0.65 + min(abs(temp_diff) * 0.05, 0.25)
        else:  # threshold > forecast, NO likely
            true_prob = 0.35 - min(temp_diff * 0.05, 0.25)
        
        true_prob = max(0.1, min(0.9, true_prob))
        
        # Add market mispricing (intentional edge for testing)
        # Randomly make market 5-15% off from true probability
        mispricing = random.uniform(0.05, 0.15) * random.choice([-1, 1])
        market_prob = max(0.1, min(0.9, true_prob + mispricing))
        
        yes_price = Decimal(str(round(market_prob, 3)))
        no_price = Decimal("1.0") - yes_price
        
        # Generate realistic liquidity
        liquidity = Decimal(str(random.randint(1000, 10000)))
        volume = Decimal(str(random.randint(500, int(liquidity))))
        
        # Market ID (mock)
        market_id = f"mock_{forecast.city.lower().replace(' ', '_')}_{market_num}_{int(datetime.now().timestamp())}"
        
        # Question text
        question = f"Will {forecast.city} high temperature exceed {threshold}°F on {forecast.forecast_date.strftime('%B %d, %Y')}?"
        description = f"Resolves YES if official high temperature in {forecast.city} is strictly greater than {threshold}°F according to NOAA."
        
        return PolymarketMarket(
            market_id=market_id,
            condition_id=market_id,
            question=question,
            description=description,
            market_type=MarketType.HIGH_TEMP,
            city=forecast.city,
            date=forecast.forecast_date,
            temp_threshold=float(threshold),
            temp_unit=TemperatureUnit.FAHRENHEIT,
            yes_price=yes_price,
            no_price=no_price,
            liquidity=liquidity,
            volume=volume,
            created_at=datetime.now(timezone.utc),
            closes_at=forecast.forecast_date,
            is_active=True,
        )
    
    @staticmethod
    def generate_high_confidence_market(forecast: NOAAForecast) -> PolymarketMarket:
        """
        Generate a market with obvious mispricing for testing.
        
        Creates a market where the edge is very clear (>15%).
        """
        # Set threshold well below forecast (very likely YES)
        threshold = round(forecast.high_temp - 8)
        true_prob = 0.85  # Very likely
        market_prob = 0.60  # Underpriced by 25%
        
        yes_price = Decimal(str(market_prob))
        no_price = Decimal("1.0") - yes_price
        
        market_id = f"mock_high_conf_{forecast.city.lower().replace(' ', '_')}_{int(datetime.now().timestamp())}"
        
        question = f"Will {forecast.city} high exceed {threshold}°F on {forecast.forecast_date.strftime('%B %d')}? [TEST MARKET]"
        
        return PolymarketMarket(
            market_id=market_id,
            condition_id=market_id,
            question=question,
            description="Mock market for testing high-confidence signals",
            market_type=MarketType.HIGH_TEMP,
            city=forecast.city,
            date=forecast.forecast_date,
            temp_threshold=float(threshold),
            temp_unit=TemperatureUnit.FAHRENHEIT,
            yes_price=yes_price,
            no_price=no_price,
            liquidity=Decimal("5000"),
            volume=Decimal("2000"),
            created_at=datetime.now(timezone.utc),
            closes_at=forecast.forecast_date,
            is_active=True,
        )
