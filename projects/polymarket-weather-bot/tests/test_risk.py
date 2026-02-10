"""Tests for risk management module"""

import pytest
from decimal import Decimal
from datetime import datetime
from unittest.mock import MagicMock

from src.trading.risk import RiskManager
from src.models import RiskMetrics, BotConfig


class TestRiskManager:
    """Test risk manager"""
    
    def test_risk_manager_initialization(self, bot_config):
        """Test risk manager initialization"""
        mock_db = MagicMock()
        rm = RiskManager(bot_config, mock_db)
        
        assert rm.config == bot_config
        assert rm.db == mock_db
    
    def test_check_signal_passes(self, bot_config, trading_signal_buy, risk_metrics):
        """Test signal that passes all checks"""
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is True
        assert reason is None
    
    def test_check_signal_circuit_breaker_triggered(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when circuit breaker triggered"""
        # Trigger circuit breaker
        risk_metrics.circuit_breaker_triggered = True
        risk_metrics.circuit_breaker_reason = "Win rate below threshold"
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "circuit breaker" in reason.lower()
    
    def test_check_signal_daily_exposure_exceeded(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when daily exposure limit exceeded"""
        # Set exposure near limit
        risk_metrics.current_daily_exposure = Decimal("490")
        risk_metrics.remaining_daily_capacity = Decimal("10")
        
        # Signal requires 35.50 but only 10 available
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "exposure limit" in reason.lower()
    
    def test_check_signal_position_size_exceeded(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when position size too large"""
        # Set position size above limit
        trading_signal_buy.recommended_position_size = Decimal("100")
        bot_config.max_position_size_dollars = Decimal("50")
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "position size" in reason.lower()
    
    def test_check_signal_max_positions_exceeded(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when max positions exceeded"""
        # Max out positions
        risk_metrics.num_active_positions = 5
        bot_config.max_correlated_positions = 3
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "active positions" in reason.lower()
    
    def test_check_signal_low_liquidity(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when liquidity too low"""
        # Set market liquidity below threshold
        trading_signal_buy.market.liquidity = Decimal("500")
        bot_config.minimum_liquidity = Decimal("1000")
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "liquidity" in reason.lower()
    
    def test_check_signal_edge_below_threshold(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when edge too low"""
        # Set edge below threshold
        trading_signal_buy.edge = 0.05
        bot_config.minimum_edge_threshold = 0.10
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "edge" in reason.lower()
    
    def test_check_signal_confidence_below_threshold(
        self,
        bot_config,
        trading_signal_buy,
        risk_metrics
    ):
        """Test signal rejection when confidence too low"""
        # Set confidence below threshold
        trading_signal_buy.confidence_score = 0.50
        bot_config.minimum_confidence_score = 0.60
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        passed, reason = rm.check_signal(trading_signal_buy)
        
        assert passed is False
        assert "confidence" in reason.lower()
    
    def test_filter_signals(
        self,
        bot_config,
        trading_signal_buy,
        trading_signal_sell,
        risk_metrics
    ):
        """Test filtering multiple signals"""
        # Make sell signal fail (low edge)
        trading_signal_sell.edge = 0.05
        bot_config.minimum_edge_threshold = 0.10
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        signals = [trading_signal_buy, trading_signal_sell]
        approved, rejected = rm.filter_signals(signals)
        
        # Buy should pass, sell should fail
        assert len(approved) == 1
        assert len(rejected) == 1
        assert approved[0].signal_id == trading_signal_buy.signal_id
        assert rejected[0][0].signal_id == trading_signal_sell.signal_id
    
    def test_filter_signals_all_pass(
        self,
        bot_config,
        trading_signal_buy,
        trading_signal_sell,
        risk_metrics
    ):
        """Test all signals pass filtering"""
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        signals = [trading_signal_buy, trading_signal_sell]
        approved, rejected = rm.filter_signals(signals)
        
        assert len(approved) == 2
        assert len(rejected) == 0
    
    def test_filter_signals_all_rejected(
        self,
        bot_config,
        trading_signal_buy,
        trading_signal_sell,
        risk_metrics
    ):
        """Test all signals rejected"""
        # Trigger circuit breaker to reject all
        risk_metrics.circuit_breaker_triggered = True
        risk_metrics.circuit_breaker_reason = "Testing"
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        signals = [trading_signal_buy, trading_signal_sell]
        approved, rejected = rm.filter_signals(signals)
        
        assert len(approved) == 0
        assert len(rejected) == 2
    
    def test_adjust_position_size_within_limit(self, bot_config):
        """Test position size adjustment when within limit"""
        mock_db = MagicMock()
        rm = RiskManager(bot_config, mock_db)
        
        adjusted = rm.adjust_position_size(
            requested=Decimal("30"),
            remaining_capacity=Decimal("100")
        )
        
        # Should return requested size
        assert adjusted == Decimal("30")
    
    def test_adjust_position_size_exceeds_capacity(self, bot_config):
        """Test position size adjustment when exceeds capacity"""
        mock_db = MagicMock()
        rm = RiskManager(bot_config, mock_db)
        
        adjusted = rm.adjust_position_size(
            requested=Decimal("50"),
            remaining_capacity=Decimal("20")
        )
        
        # Should cap at remaining capacity
        assert adjusted == Decimal("20")
    
    def test_check_circuit_breaker_normal(self, bot_config, risk_metrics):
        """Test circuit breaker when performance is normal"""
        # Good win rate
        risk_metrics.win_rate = 0.60
        risk_metrics.total_trades = 25
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        triggered, reason = rm.check_circuit_breaker()
        
        assert triggered is False
        assert reason is None
    
    def test_check_circuit_breaker_low_win_rate(self, bot_config, risk_metrics):
        """Test circuit breaker triggers on low win rate"""
        # Poor win rate over sufficient trades
        risk_metrics.win_rate = 0.35
        risk_metrics.total_trades = 25
        bot_config.circuit_breaker_min_win_rate = 0.50
        bot_config.circuit_breaker_lookback_trades = 20
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        triggered, reason = rm.check_circuit_breaker()
        
        assert triggered is True
        assert "win rate" in reason.lower()
    
    def test_check_circuit_breaker_insufficient_trades(self, bot_config, risk_metrics):
        """Test circuit breaker doesn't trigger without enough trades"""
        # Poor win rate but not enough trades
        risk_metrics.win_rate = 0.35
        risk_metrics.total_trades = 5
        bot_config.circuit_breaker_lookback_trades = 20
        
        mock_db = MagicMock()
        mock_db.get_risk_metrics.return_value = risk_metrics
        
        rm = RiskManager(bot_config, mock_db)
        
        triggered, reason = rm.check_circuit_breaker()
        
        # Should not trigger - need more data
        assert triggered is False
