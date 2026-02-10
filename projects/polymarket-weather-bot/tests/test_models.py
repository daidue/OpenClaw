"""Tests for Pydantic data models"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from pydantic import ValidationError

from src.models import (
    NOAAForecast,
    PolymarketMarket,
    TradingSignal,
    Trade,
    RiskMetrics,
    DailyPerformance,
    BotConfig,
    MarketType,
    TemperatureUnit,
    TradeDirection,
    TradeStatus,
    ConfidenceLevel,
)


class TestNOAAForecast:
    """Test NOAA forecast model"""
    
    def test_valid_forecast(self, noaa_forecast_nyc):
        """Test valid forecast creation"""
        assert noaa_forecast_nyc.city == "New York"
        assert noaa_forecast_nyc.high_temp == 55.0
        assert noaa_forecast_nyc.high_temp_confidence == 0.85
    
    def test_confidence_validation(self):
        """Test confidence must be between 0 and 1"""
        with pytest.raises(ValidationError):
            NOAAForecast(
                city="Test",
                latitude=40.0,
                longitude=-74.0,
                grid_office="TEST",
                grid_x=1,
                grid_y=1,
                forecast_date=datetime.now(),
                forecast_generated_at=datetime.now(),
                high_temp_confidence=1.5,  # Invalid: > 1
                forecast_horizon_hours=24,
            )
    
    def test_optional_fields(self):
        """Test optional fields can be None"""
        forecast = NOAAForecast(
            city="Test",
            latitude=40.0,
            longitude=-74.0,
            grid_office="TEST",
            grid_x=1,
            grid_y=1,
            forecast_date=datetime.now(),
            forecast_generated_at=datetime.now(),
            forecast_horizon_hours=24,
        )
        assert forecast.high_temp is None
        assert forecast.precipitation_probability is None
    
    def test_precipitation_probability_bounds(self):
        """Test precipitation probability validation"""
        with pytest.raises(ValidationError):
            NOAAForecast(
                city="Test",
                latitude=40.0,
                longitude=-74.0,
                grid_office="TEST",
                grid_x=1,
                grid_y=1,
                forecast_date=datetime.now(),
                forecast_generated_at=datetime.now(),
                precipitation_probability=-0.1,  # Invalid: < 0
                forecast_horizon_hours=24,
            )


class TestPolymarketMarket:
    """Test Polymarket market model"""
    
    def test_valid_market(self, polymarket_market_nyc_high_temp):
        """Test valid market creation"""
        assert polymarket_market_nyc_high_temp.city == "New York"
        assert polymarket_market_nyc_high_temp.market_type == MarketType.HIGH_TEMP
        assert polymarket_market_nyc_high_temp.yes_price == Decimal("0.60")
    
    def test_price_validation(self, tomorrow):
        """Test market prices must be between 0 and 1"""
        with pytest.raises(ValidationError):
            PolymarketMarket(
                market_id="test",
                condition_id="test",
                question="Test?",
                market_type=MarketType.HIGH_TEMP,
                city="Test",
                date=tomorrow,
                yes_price=Decimal("1.5"),  # Invalid: > 1
                no_price=Decimal("0.5"),
                liquidity=Decimal("1000"),
                volume=Decimal("500"),
                created_at=datetime.now(),
            )
    
    def test_market_implied_probability(self, polymarket_market_nyc_high_temp):
        """Test market implied probability property"""
        prob = polymarket_market_nyc_high_temp.market_implied_probability
        assert prob == 0.60
        assert isinstance(prob, float)
    
    def test_temperature_units(self, polymarket_market_nyc_high_temp):
        """Test temperature unit enum"""
        assert polymarket_market_nyc_high_temp.temp_unit == TemperatureUnit.FAHRENHEIT
        
        market = polymarket_market_nyc_high_temp.copy()
        market.temp_unit = TemperatureUnit.CELSIUS
        assert market.temp_unit == TemperatureUnit.CELSIUS


class TestTradingSignal:
    """Test trading signal model"""
    
    def test_valid_signal(self, trading_signal_buy):
        """Test valid signal creation"""
        assert trading_signal_buy.direction == TradeDirection.BUY
        assert trading_signal_buy.edge == 0.25
        assert trading_signal_buy.confidence == ConfidenceLevel.HIGH
    
    def test_edge_validation(self, noaa_forecast_nyc, polymarket_market_nyc_high_temp):
        """Test edge must be between -1 and 1"""
        with pytest.raises(ValidationError):
            TradingSignal(
                signal_id="test",
                generated_at=datetime.now(),
                market=polymarket_market_nyc_high_temp,
                noaa_forecast=noaa_forecast_nyc,
                direction=TradeDirection.BUY,
                noaa_probability=0.9,
                market_probability=0.6,
                edge=1.5,  # Invalid: > 1
                confidence=ConfidenceLevel.HIGH,
                confidence_score=0.8,
                recommended_position_size=Decimal("50"),
                expected_value=10.0,
                reasoning="Test",
            )
    
    def test_risk_factors_default(self, trading_signal_buy):
        """Test risk factors default to empty list"""
        signal = TradingSignal(
            signal_id="test",
            generated_at=datetime.now(),
            market=trading_signal_buy.market,
            noaa_forecast=trading_signal_buy.noaa_forecast,
            direction=TradeDirection.BUY,
            noaa_probability=0.8,
            market_probability=0.6,
            edge=0.2,
            confidence=ConfidenceLevel.HIGH,
            confidence_score=0.8,
            recommended_position_size=Decimal("50"),
            expected_value=10.0,
            reasoning="Test",
        )
        assert signal.risk_factors == []


class TestTrade:
    """Test trade model"""
    
    def test_valid_trade(self, executed_trade):
        """Test valid trade creation"""
        assert executed_trade.status == TradeStatus.EXECUTED
        assert executed_trade.position_size == Decimal("35.50")
        assert executed_trade.entry_price == Decimal("0.60")
    
    def test_optional_pnl_fields(self, executed_trade):
        """Test P&L fields are optional initially"""
        assert executed_trade.realized_pnl is None
        assert executed_trade.unrealized_pnl is None
        assert executed_trade.exit_price is None
    
    def test_closed_trade(self, closed_winning_trade):
        """Test closed trade with P&L"""
        assert closed_winning_trade.exit_price == Decimal("1.00")
        assert closed_winning_trade.realized_pnl == Decimal("14.20")
        assert closed_winning_trade.closed_at is not None


class TestRiskMetrics:
    """Test risk metrics model"""
    
    def test_valid_metrics(self, risk_metrics):
        """Test valid risk metrics"""
        assert risk_metrics.num_active_positions == 0
        assert risk_metrics.win_rate == 0.60
        assert not risk_metrics.circuit_breaker_triggered
    
    def test_win_rate_validation(self):
        """Test win rate must be between 0 and 1"""
        with pytest.raises(ValidationError):
            RiskMetrics(
                current_date=datetime.now(),
                max_position_size=Decimal("50"),
                max_daily_exposure=Decimal("500"),
                current_daily_exposure=Decimal("100"),
                remaining_daily_capacity=Decimal("400"),
                num_active_positions=2,
                total_capital_at_risk=Decimal("100"),
                correlated_positions=0,
                total_trades=10,
                winning_trades=5,
                losing_trades=5,
                win_rate=1.5,  # Invalid: > 1
                circuit_breaker_triggered=False,
            )
    
    def test_circuit_breaker_reason_optional(self, risk_metrics):
        """Test circuit breaker reason is optional"""
        assert risk_metrics.circuit_breaker_reason is None
        
        metrics = risk_metrics.copy()
        metrics.circuit_breaker_triggered = True
        metrics.circuit_breaker_reason = "Win rate below threshold"
        assert metrics.circuit_breaker_reason == "Win rate below threshold"


class TestDailyPerformance:
    """Test daily performance model"""
    
    def test_valid_daily_performance(self):
        """Test valid daily performance creation"""
        perf = DailyPerformance(
            date=datetime.now(),
            num_trades=10,
            winning_trades=6,
            losing_trades=4,
            win_rate=0.60,
            gross_pnl=Decimal("100"),
            net_pnl=Decimal("95"),
            cumulative_pnl=Decimal("500"),
            max_drawdown=Decimal("50"),
            largest_win=Decimal("30"),
            largest_loss=Decimal("20"),
            starting_capital=Decimal("1000"),
            ending_capital=Decimal("1095"),
            roi=0.095,
        )
        assert perf.win_rate == 0.60
        assert perf.net_pnl == Decimal("95")


class TestBotConfig:
    """Test bot configuration model"""
    
    def test_default_config(self):
        """Test config with all defaults"""
        config = BotConfig()
        assert config.noaa_update_interval_seconds == 3600
        assert config.minimum_edge_threshold == 0.10
        assert config.kelly_fraction == 0.25
        assert config.simmer_mode == "sandbox"
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = BotConfig(
            minimum_edge_threshold=0.15,
            max_position_size_dollars=Decimal("100"),
            kelly_fraction=0.5,
        )
        assert config.minimum_edge_threshold == 0.15
        assert config.max_position_size_dollars == Decimal("100")
        assert config.kelly_fraction == 0.5
    
    def test_risk_parameters(self, bot_config):
        """Test risk management parameters"""
        assert bot_config.max_position_size_dollars == Decimal("50")
        assert bot_config.max_daily_exposure_dollars == Decimal("500")
        assert bot_config.stop_loss_percent == 0.20
        assert bot_config.circuit_breaker_min_win_rate == 0.50


class TestEnums:
    """Test enum types"""
    
    def test_market_type_enum(self):
        """Test MarketType enum"""
        assert MarketType.HIGH_TEMP.value == "high_temp"
        assert MarketType.LOW_TEMP.value == "low_temp"
        assert MarketType.PRECIPITATION.value == "precipitation"
        assert MarketType.UNKNOWN.value == "unknown"
    
    def test_temperature_unit_enum(self):
        """Test TemperatureUnit enum"""
        assert TemperatureUnit.FAHRENHEIT.value == "F"
        assert TemperatureUnit.CELSIUS.value == "C"
    
    def test_trade_direction_enum(self):
        """Test TradeDirection enum"""
        assert TradeDirection.BUY.value == "buy"
        assert TradeDirection.SELL.value == "sell"
    
    def test_trade_status_enum(self):
        """Test TradeStatus enum"""
        assert TradeStatus.PENDING.value == "pending"
        assert TradeStatus.EXECUTED.value == "executed"
        assert TradeStatus.FAILED.value == "failed"
        assert TradeStatus.CANCELLED.value == "cancelled"
    
    def test_confidence_level_enum(self):
        """Test ConfidenceLevel enum"""
        assert ConfidenceLevel.VERY_LOW.value == "very_low"
        assert ConfidenceLevel.LOW.value == "low"
        assert ConfidenceLevel.MEDIUM.value == "medium"
        assert ConfidenceLevel.HIGH.value == "high"
        assert ConfidenceLevel.VERY_HIGH.value == "very_high"
