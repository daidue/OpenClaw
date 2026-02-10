"""Shared pytest fixtures for weather trading bot tests"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List

from src.models import (
    NOAAForecast,
    PolymarketMarket,
    MarketType,
    TemperatureUnit,
    TradingSignal,
    TradeDirection,
    ConfidenceLevel,
    BotConfig,
    Trade,
    TradeStatus,
    RiskMetrics,
)


# ==================== Time Fixtures ====================

@pytest.fixture
def now():
    """Current datetime"""
    return datetime(2026, 2, 10, 12, 0, 0)


@pytest.fixture
def tomorrow(now):
    """Tomorrow's date"""
    return now + timedelta(days=1)


@pytest.fixture
def yesterday(now):
    """Yesterday's date"""
    return now - timedelta(days=1)


# ==================== Config Fixtures ====================

@pytest.fixture
def bot_config():
    """Default bot configuration"""
    return BotConfig(
        noaa_update_interval_seconds=3600,
        noaa_request_timeout_seconds=15,
        noaa_cache_ttl_seconds=1800,
        polymarket_update_interval_seconds=300,
        polymarket_rate_limit_per_second=5.0,
        minimum_edge_threshold=0.10,
        minimum_confidence_score=0.6,
        minimum_liquidity=Decimal("1000"),
        max_position_size_dollars=Decimal("50"),
        max_daily_exposure_dollars=Decimal("500"),
        stop_loss_percent=0.20,
        max_correlated_positions=3,
        circuit_breaker_min_win_rate=0.50,
        circuit_breaker_lookback_trades=20,
        simmer_mode="sandbox",
        kelly_fraction=0.25,
    )


# ==================== NOAA Fixtures ====================

@pytest.fixture
def noaa_forecast_nyc(tomorrow):
    """Sample NOAA forecast for NYC"""
    return NOAAForecast(
        city="New York",
        latitude=40.7128,
        longitude=-74.0060,
        grid_office="OKX",
        grid_x=33,
        grid_y=35,
        forecast_date=tomorrow,
        forecast_generated_at=datetime.now(),
        high_temp=55.0,
        low_temp=42.0,
        high_temp_confidence=0.85,
        low_temp_confidence=0.80,
        precipitation_probability=0.20,
        forecast_horizon_hours=24,
        raw_data={"source": "test"},
    )


@pytest.fixture
def noaa_forecast_chicago(tomorrow):
    """Sample NOAA forecast for Chicago"""
    return NOAAForecast(
        city="Chicago",
        latitude=41.8781,
        longitude=-87.6298,
        grid_office="LOT",
        grid_x=75,
        grid_y=73,
        forecast_date=tomorrow,
        forecast_generated_at=datetime.now(),
        high_temp=38.0,
        low_temp=28.0,
        high_temp_confidence=0.75,
        low_temp_confidence=0.70,
        precipitation_probability=0.40,
        forecast_horizon_hours=24,
        raw_data={"source": "test"},
    )


@pytest.fixture
def noaa_api_response_grid():
    """Sample NOAA API response for grid point lookup"""
    return {
        "properties": {
            "gridId": "OKX",
            "gridX": 33,
            "gridY": 35,
            "forecastHourly": "https://api.weather.gov/gridpoints/OKX/33,35/forecast/hourly",
            "forecast": "https://api.weather.gov/gridpoints/OKX/33,35/forecast",
        }
    }


@pytest.fixture
def noaa_api_response_forecast():
    """Sample NOAA API response for hourly forecast"""
    return {
        "properties": {
            "periods": [
                {
                    "number": 1,
                    "startTime": "2026-02-11T00:00:00-05:00",
                    "endTime": "2026-02-11T01:00:00-05:00",
                    "temperature": 52,
                    "temperatureUnit": "F",
                    "probabilityOfPrecipitation": {"value": 20},
                    "shortForecast": "Partly Cloudy",
                },
                {
                    "number": 2,
                    "startTime": "2026-02-11T01:00:00-05:00",
                    "endTime": "2026-02-11T02:00:00-05:00",
                    "temperature": 51,
                    "temperatureUnit": "F",
                    "probabilityOfPrecipitation": {"value": 15},
                    "shortForecast": "Mostly Cloudy",
                },
                # High temp period
                {
                    "number": 8,
                    "startTime": "2026-02-11T14:00:00-05:00",
                    "endTime": "2026-02-11T15:00:00-05:00",
                    "temperature": 55,
                    "temperatureUnit": "F",
                    "probabilityOfPrecipitation": {"value": 10},
                    "shortForecast": "Sunny",
                },
            ]
        }
    }


# ==================== Polymarket Fixtures ====================

@pytest.fixture
def polymarket_market_nyc_high_temp(tomorrow):
    """Sample Polymarket market for NYC high temperature"""
    return PolymarketMarket(
        market_id="0xabc123",
        condition_id="0xcondition123",
        question="Will NYC high temperature exceed 50°F on Feb 11?",
        description="Resolves YES if official high temp > 50°F",
        market_type=MarketType.HIGH_TEMP,
        city="New York",
        date=tomorrow,
        temp_threshold=50.0,
        temp_unit=TemperatureUnit.FAHRENHEIT,
        yes_price=Decimal("0.60"),
        no_price=Decimal("0.40"),
        liquidity=Decimal("5000"),
        volume=Decimal("12000"),
        created_at=datetime.now() - timedelta(days=3),
        closes_at=tomorrow + timedelta(hours=23, minutes=59),
        is_active=True,
    )


@pytest.fixture
def polymarket_market_chicago_low_temp(tomorrow):
    """Sample Polymarket market for Chicago low temperature"""
    return PolymarketMarket(
        market_id="0xdef456",
        condition_id="0xcondition456",
        question="Will Chicago low temperature drop below 30°F on Feb 11?",
        description="Resolves YES if official low temp < 30°F",
        market_type=MarketType.LOW_TEMP,
        city="Chicago",
        date=tomorrow,
        temp_threshold=30.0,
        temp_unit=TemperatureUnit.FAHRENHEIT,
        yes_price=Decimal("0.65"),
        no_price=Decimal("0.35"),
        liquidity=Decimal("3000"),
        volume=Decimal("8000"),
        created_at=datetime.now() - timedelta(days=2),
        closes_at=tomorrow + timedelta(hours=23, minutes=59),
        is_active=True,
    )


@pytest.fixture
def polymarket_api_response_markets():
    """Sample Polymarket API response for markets list"""
    return [
        {
            "condition_id": "0xcondition123",
            "question": "Will NYC high temperature exceed 50°F on Feb 11?",
            "description": "Resolves YES if official high temp > 50°F",
            "market_slug": "nyc-high-temp-feb-11",
            "active": True,
            "closed": False,
        },
        {
            "condition_id": "0xcondition456",
            "question": "Will Chicago low temperature drop below 30°F on Feb 11?",
            "description": "Resolves YES if official low temp < 30°F",
            "market_slug": "chicago-low-temp-feb-11",
            "active": True,
            "closed": False,
        },
    ]


@pytest.fixture
def polymarket_api_response_prices():
    """Sample Polymarket API response for market prices"""
    return {
        "market": "0xcondition123",
        "timestamp": 1707580800,
        "tokens": [
            {"token_id": "0xyes123", "price": "0.60", "outcome": "Yes"},
            {"token_id": "0xno123", "price": "0.40", "outcome": "No"},
        ],
    }


# ==================== Signal Fixtures ====================

@pytest.fixture
def trading_signal_buy(noaa_forecast_nyc, polymarket_market_nyc_high_temp):
    """Sample BUY trading signal"""
    return TradingSignal(
        signal_id="sig_001",
        generated_at=datetime.now(),
        market=polymarket_market_nyc_high_temp,
        noaa_forecast=noaa_forecast_nyc,
        direction=TradeDirection.BUY,
        noaa_probability=0.85,
        market_probability=0.60,
        edge=0.25,
        confidence=ConfidenceLevel.HIGH,
        confidence_score=0.80,
        recommended_position_size=Decimal("35.50"),
        expected_value=8.88,
        reasoning="NOAA forecasts 55°F high with 85% confidence, market only pricing 60%",
        risk_factors=["Low liquidity", "Forecast horizon 24h"],
    )


@pytest.fixture
def trading_signal_sell(noaa_forecast_chicago, polymarket_market_chicago_low_temp):
    """Sample SELL trading signal"""
    return TradingSignal(
        signal_id="sig_002",
        generated_at=datetime.now(),
        market=polymarket_market_chicago_low_temp,
        noaa_forecast=noaa_forecast_chicago,
        direction=TradeDirection.SELL,
        noaa_probability=0.55,
        market_probability=0.65,
        edge=0.10,
        confidence=ConfidenceLevel.MEDIUM,
        confidence_score=0.65,
        recommended_position_size=Decimal("20.00"),
        expected_value=2.00,
        reasoning="NOAA shows 55% chance of <30°F, market overpriced at 65%",
        risk_factors=["Medium confidence", "Weather volatility"],
    )


# ==================== Trade Fixtures ====================

@pytest.fixture
def executed_trade(trading_signal_buy):
    """Sample executed trade"""
    return Trade(
        trade_id="trade_001",
        signal_id=trading_signal_buy.signal_id,
        executed_at=datetime.now(),
        market_id=trading_signal_buy.market.market_id,
        market_question=trading_signal_buy.market.question,
        direction=trading_signal_buy.direction,
        position_size=Decimal("35.50"),
        entry_price=Decimal("0.60"),
        status=TradeStatus.EXECUTED,
        notes="First test trade",
        raw_response={"tx_hash": "0xtest123"},
    )


@pytest.fixture
def closed_winning_trade(executed_trade):
    """Sample closed winning trade"""
    trade = executed_trade.copy()
    trade.exit_price = Decimal("1.00")
    trade.realized_pnl = Decimal("14.20")
    trade.status = TradeStatus.EXECUTED
    trade.closed_at = datetime.now() + timedelta(days=1)
    return trade


# ==================== Risk Fixtures ====================

@pytest.fixture
def risk_metrics():
    """Sample risk metrics"""
    return RiskMetrics(
        current_date=datetime.now(),
        max_position_size=Decimal("50"),
        max_daily_exposure=Decimal("500"),
        current_daily_exposure=Decimal("150"),
        remaining_daily_capacity=Decimal("350"),
        num_active_positions=0,
        total_capital_at_risk=Decimal("150"),
        correlated_positions=0,
        total_trades=25,
        winning_trades=15,
        losing_trades=10,
        win_rate=0.60,
        circuit_breaker_triggered=False,
    )


# ==================== Database Fixtures ====================

@pytest.fixture
def test_db():
    """Create in-memory test database"""
    from src.database import Database
    
    db = Database(":memory:")
    yield db
    # Database closes connection automatically via context manager


# ==================== Mock HTTP Fixtures ====================

@pytest.fixture
def mock_noaa_session(noaa_api_response_grid, noaa_api_response_forecast):
    """Mock aiohttp session for NOAA API"""
    from unittest.mock import AsyncMock, MagicMock
    
    async def mock_get(url, *args, **kwargs):
        response = MagicMock()
        response.status = 200
        
        if "/points/" in url:
            response.json = AsyncMock(return_value=noaa_api_response_grid)
        elif "/forecast/hourly" in url:
            response.json = AsyncMock(return_value=noaa_api_response_forecast)
        else:
            response.json = AsyncMock(return_value={})
        
        return response
    
    session = MagicMock()
    session.get = MagicMock(return_value=AsyncMock().__aenter__.return_value)
    session.get.return_value.__aenter__.return_value = mock_get
    
    return session


@pytest.fixture
def mock_polymarket_session(polymarket_api_response_markets, polymarket_api_response_prices):
    """Mock aiohttp session for Polymarket API"""
    from unittest.mock import AsyncMock, MagicMock
    
    async def mock_get(url, *args, **kwargs):
        response = MagicMock()
        response.status = 200
        
        if "/markets" in url:
            response.json = AsyncMock(return_value=polymarket_api_response_markets)
        elif "/prices" in url:
            response.json = AsyncMock(return_value=polymarket_api_response_prices)
        else:
            response.json = AsyncMock(return_value={})
        
        return response
    
    session = MagicMock()
    session.get = MagicMock(return_value=AsyncMock().__aenter__.return_value)
    session.get.return_value.__aenter__.return_value = mock_get
    
    return session
