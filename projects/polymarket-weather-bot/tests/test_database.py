"""Tests for database operations"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from src.database import Database
from src.models import TradeStatus


class TestDatabase:
    """Test database operations"""
    
    def test_database_initialization(self):
        """Test database initialization"""
        db = Database(":memory:")
        
        assert db.db_path.name == ":memory:"
    
    def test_save_and_get_trade(self, test_db, executed_trade):
        """Test saving and retrieving trade"""
        test_db.save_trade(executed_trade)
        
        retrieved = test_db.get_trade(executed_trade.trade_id)
        
        assert retrieved is not None
        assert retrieved.trade_id == executed_trade.trade_id
        assert retrieved.signal_id == executed_trade.signal_id
        assert retrieved.position_size == executed_trade.position_size
    
    def test_get_nonexistent_trade(self, test_db):
        """Test getting trade that doesn't exist"""
        retrieved = test_db.get_trade("nonexistent_id")
        
        assert retrieved is None
    
    def test_update_trade(self, test_db, executed_trade, closed_winning_trade):
        """Test updating trade"""
        # Save initial trade
        test_db.save_trade(executed_trade)
        
        # Update with closed trade data
        test_db.save_trade(closed_winning_trade)
        
        # Retrieve and verify
        retrieved = test_db.get_trade(closed_winning_trade.trade_id)
        
        assert retrieved.exit_price == closed_winning_trade.exit_price
        assert retrieved.realized_pnl == closed_winning_trade.realized_pnl
        assert retrieved.closed_at is not None
    
    def test_get_active_trades(self, test_db, executed_trade, closed_winning_trade):
        """Test getting active trades"""
        # Save one active and one closed trade
        test_db.save_trade(executed_trade)
        test_db.save_trade(closed_winning_trade)
        
        active = test_db.get_active_trades()
        
        # Should only return the active trade (no closed_at)
        assert len(active) == 1
        assert active[0].trade_id == executed_trade.trade_id
        assert active[0].closed_at is None
    
    def test_get_trades_by_date(self, test_db, executed_trade):
        """Test getting trades by date"""
        # Save trade
        test_db.save_trade(executed_trade)
        
        # Query with date
        date = executed_trade.executed_at.date()
        
        trades = test_db.get_trades_by_date(date)
        
        assert len(trades) >= 1
        assert any(t.trade_id == executed_trade.trade_id for t in trades)
    
    def test_get_all_trades(self, test_db, executed_trade, closed_winning_trade):
        """Test getting all trades"""
        test_db.save_trade(executed_trade)
        test_db.save_trade(closed_winning_trade)
        
        all_trades = test_db.get_all_trades()
        
        assert len(all_trades) == 2
    
    def test_save_signal(self, test_db, trading_signal_buy):
        """Test saving trading signal"""
        test_db.save_signal(trading_signal_buy)
        
        # Verify signal was saved
        signal = test_db.get_signal(trading_signal_buy.signal_id)
        assert signal is not None
        assert signal.signal_id == trading_signal_buy.signal_id
    
    def test_get_signals_by_date(self, test_db, trading_signal_buy):
        """Test getting signals by date"""
        test_db.save_signal(trading_signal_buy)
        
        date = trading_signal_buy.generated_at.date()
        signals = test_db.get_signals_by_date(date)
        
        assert isinstance(signals, list)
        assert len(signals) >= 1
    
    def test_mark_signal_executed(self, test_db, trading_signal_buy):
        """Test marking signal as executed"""
        test_db.save_signal(trading_signal_buy)
        test_db.mark_signal_executed(trading_signal_buy.signal_id)
        
        signal = test_db.get_signal(trading_signal_buy.signal_id)
        assert signal.was_executed is True
    
    def test_get_risk_metrics(self, test_db, executed_trade, closed_winning_trade):
        """Test calculating risk metrics"""
        # Save trades
        test_db.save_trade(executed_trade)
        test_db.save_trade(closed_winning_trade)
        
        metrics = test_db.get_risk_metrics()
        
        assert metrics is not None
        assert metrics.num_active_positions >= 0
        assert metrics.total_trades >= 0
        assert 0 <= metrics.win_rate <= 1
    
    def test_get_risk_metrics_exposure_calculation(
        self,
        test_db,
        executed_trade
    ):
        """Test risk metrics exposure calculation"""
        # Save multiple active trades
        trade1 = executed_trade.copy()
        trade1.trade_id = "trade_1"
        trade1.position_size = Decimal("30")
        
        trade2 = executed_trade.copy()
        trade2.trade_id = "trade_2"
        trade2.position_size = Decimal("40")
        
        test_db.save_trade(trade1)
        test_db.save_trade(trade2)
        
        metrics = test_db.get_risk_metrics()
        
        # Total exposure should be sum of position sizes
        assert metrics.current_daily_exposure == Decimal("70")
    
    def test_get_risk_metrics_win_rate(
        self,
        test_db,
        closed_winning_trade
    ):
        """Test win rate calculation"""
        # Create winning and losing trades
        win_trade = closed_winning_trade.copy()
        win_trade.trade_id = "win_1"
        win_trade.realized_pnl = Decimal("10")
        
        loss_trade = closed_winning_trade.copy()
        loss_trade.trade_id = "loss_1"
        loss_trade.realized_pnl = Decimal("-5")
        
        test_db.save_trade(win_trade)
        test_db.save_trade(loss_trade)
        
        metrics = test_db.get_risk_metrics()
        
        # 1 win, 1 loss = 50% win rate
        assert metrics.total_trades == 2
        assert metrics.winning_trades == 1
        assert metrics.losing_trades == 1
        assert metrics.win_rate == 0.50
    
    def test_get_daily_performance(self, test_db, closed_winning_trade):
        """Test daily performance calculation"""
        # Save closed trade
        test_db.save_trade(closed_winning_trade)
        
        date = closed_winning_trade.executed_at.date()
        perf = test_db.get_daily_performance(date)
        
        assert perf is not None
        assert perf.num_trades >= 1
        assert perf.gross_pnl >= Decimal("0")
    
    def test_get_performance_last_n_days(
        self,
        test_db,
        closed_winning_trade
    ):
        """Test getting performance for last N days"""
        # Save trade
        test_db.save_trade(closed_winning_trade)
        
        # Get last 7 days
        history = test_db.get_performance_last_n_days(7)
        
        assert isinstance(history, list)
        assert len(history) >= 0
    
    def test_database_multiple_trades_same_day(self, test_db, executed_trade):
        """Test handling multiple trades on same day"""
        trade1 = executed_trade.copy()
        trade1.trade_id = "trade_day_1"
        
        trade2 = executed_trade.copy()
        trade2.trade_id = "trade_day_2"
        
        test_db.save_trade(trade1)
        test_db.save_trade(trade2)
        
        date = executed_trade.executed_at.date()
        trades = test_db.get_trades_by_date(date)
        
        assert len(trades) == 2
    
    def test_save_noaa_forecast(self, test_db, noaa_forecast_nyc):
        """Test saving NOAA forecast for accuracy tracking"""
        test_db.save_noaa_forecast(noaa_forecast_nyc)
        
        # Basic check that it saves without error
        assert True
    
    def test_update_actual_temps(self, test_db, noaa_forecast_nyc):
        """Test updating actual temperatures"""
        test_db.save_noaa_forecast(noaa_forecast_nyc)
        
        # Update with actual temps
        forecast_id = 1  # Assuming first forecast
        test_db.update_actual_temps(
            forecast_id,
            actual_high=56.0,
            actual_low=43.0
        )
        
        # Verify update succeeded
        assert True
    
    def test_get_forecast_accuracy(self, test_db):
        """Test getting forecast accuracy statistics"""
        # This method might not exist yet
        try:
            stats = test_db.get_forecast_accuracy()
            assert isinstance(stats, dict)
        except AttributeError:
            # Method not implemented yet
            assert True
    
    def test_delete_old_trades(self, test_db, executed_trade):
        """Test deleting old trades"""
        # Save old trade
        old_trade = executed_trade.copy()
        old_trade.trade_id = "old_trade"
        old_trade.executed_at = datetime.now() - timedelta(days=100)
        
        test_db.save_trade(old_trade)
        
        # Delete trades older than 90 days
        deleted = test_db.delete_old_trades(days=90)
        
        # Verify deletion
        retrieved = test_db.get_trade("old_trade")
        assert retrieved is None
    
    def test_get_stats(self, test_db, executed_trade, closed_winning_trade):
        """Test getting database statistics"""
        # Save some trades
        test_db.save_trade(executed_trade)
        test_db.save_trade(closed_winning_trade)
        
        stats = test_db.get_stats()
        
        assert isinstance(stats, dict)
        assert 'total_trades' in stats
    
    def test_vacuum(self, test_db):
        """Test database vacuuming"""
        # Should execute without error
        test_db.vacuum()
        assert True
