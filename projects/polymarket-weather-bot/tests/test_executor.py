"""Tests for trade execution module"""

import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from src.trading.executor import TradeExecutor
from src.models import TradeStatus, TradeDirection


class TestTradeExecutor:
    """Test trade executor"""
    
    def test_executor_initialization(self, bot_config):
        """Test executor initialization"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        assert executor.config == bot_config
        assert executor.db == mock_db
    
    @pytest.mark.asyncio
    async def test_execute_signal_sandbox_mode(
        self,
        bot_config,
        trading_signal_buy
    ):
        """Test executing signal in sandbox mode"""
        bot_config.simmer_mode = "sandbox"
        mock_db = MagicMock()
        mock_db.record_trade = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        trade = await executor.execute_signal(trading_signal_buy)
        
        assert trade is not None
        assert trade.status == TradeStatus.EXECUTED
        assert trade.signal_id == trading_signal_buy.signal_id
        assert trade.direction == trading_signal_buy.direction
        assert trade.position_size == trading_signal_buy.recommended_position_size
    
    @pytest.mark.asyncio
    async def test_execute_signal_records_trade(
        self,
        bot_config,
        trading_signal_buy
    ):
        """Test that execution records trade in database"""
        bot_config.simmer_mode = "sandbox"
        mock_db = MagicMock()
        mock_db.record_trade = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        trade = await executor.execute_signal(trading_signal_buy)
        
        # Should record trade
        mock_db.record_trade.assert_called_once()
        call_args = mock_db.record_trade.call_args[0]
        assert call_args[0] == trade
    
    @pytest.mark.asyncio
    async def test_execute_signal_buy_direction(
        self,
        bot_config,
        trading_signal_buy
    ):
        """Test executing BUY signal"""
        bot_config.simmer_mode = "sandbox"
        mock_db = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        trade = await executor.execute_signal(trading_signal_buy)
        
        assert trade.direction == TradeDirection.BUY
        assert trade.entry_price == trading_signal_buy.market.yes_price
    
    @pytest.mark.asyncio
    async def test_execute_signal_sell_direction(
        self,
        bot_config,
        trading_signal_sell
    ):
        """Test executing SELL signal"""
        bot_config.simmer_mode = "sandbox"
        mock_db = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        trade = await executor.execute_signal(trading_signal_sell)
        
        assert trade.direction == TradeDirection.SELL
        # SELL uses NO price
        assert trade.entry_price == trading_signal_sell.market.no_price
    
    @pytest.mark.asyncio
    async def test_execute_signal_production_mode_not_implemented(
        self,
        bot_config,
        trading_signal_buy
    ):
        """Test production mode raises NotImplementedError"""
        bot_config.simmer_mode = "production"
        mock_db = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        with pytest.raises(NotImplementedError):
            await executor.execute_signal(trading_signal_buy)
    
    @pytest.mark.asyncio
    async def test_execute_multiple_signals(
        self,
        bot_config,
        trading_signal_buy,
        trading_signal_sell
    ):
        """Test executing multiple signals"""
        bot_config.simmer_mode = "sandbox"
        mock_db = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        signals = [trading_signal_buy, trading_signal_sell]
        trades = await executor.execute_signals(signals)
        
        assert len(trades) == 2
        assert all(t.status == TradeStatus.EXECUTED for t in trades)
    
    @pytest.mark.asyncio
    async def test_execute_signals_empty_list(self, bot_config):
        """Test executing empty signal list"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        trades = await executor.execute_signals([])
        
        assert trades == []
    
    @pytest.mark.asyncio
    async def test_simulate_trade_execution(
        self,
        bot_config,
        trading_signal_buy
    ):
        """Test trade simulation"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        trade = executor._simulate_trade(trading_signal_buy)
        
        assert trade.status == TradeStatus.EXECUTED
        assert trade.market_id == trading_signal_buy.market.market_id
        assert trade.position_size == trading_signal_buy.recommended_position_size
        assert "sandbox" in trade.notes.lower()
    
    def test_calculate_entry_price_buy(
        self,
        bot_config,
        trading_signal_buy
    ):
        """Test entry price calculation for BUY"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        price = executor._calculate_entry_price(trading_signal_buy)
        
        assert price == trading_signal_buy.market.yes_price
    
    def test_calculate_entry_price_sell(
        self,
        bot_config,
        trading_signal_sell
    ):
        """Test entry price calculation for SELL"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        price = executor._calculate_entry_price(trading_signal_sell)
        
        assert price == trading_signal_sell.market.no_price
    
    def test_generate_trade_id(self, bot_config):
        """Test trade ID generation"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        trade_id_1 = executor._generate_trade_id()
        trade_id_2 = executor._generate_trade_id()
        
        # Should be unique
        assert trade_id_1 != trade_id_2
        # Should have trade prefix
        assert trade_id_1.startswith("trade_")
    
    @pytest.mark.asyncio
    async def test_check_trade_status(self, bot_config, executed_trade):
        """Test checking trade status"""
        mock_db = MagicMock()
        mock_db.get_trade = MagicMock(return_value=executed_trade)
        
        executor = TradeExecutor(bot_config, mock_db)
        
        status = await executor.check_trade_status(executed_trade.trade_id)
        
        assert status == TradeStatus.EXECUTED
    
    @pytest.mark.asyncio
    async def test_get_active_trades(self, bot_config, executed_trade):
        """Test getting active trades"""
        mock_db = MagicMock()
        mock_db.get_active_trades = MagicMock(return_value=[executed_trade])
        
        executor = TradeExecutor(bot_config, mock_db)
        
        active = await executor.get_active_trades()
        
        assert len(active) == 1
        assert active[0].trade_id == executed_trade.trade_id
    
    @pytest.mark.asyncio
    async def test_close_trade_sandbox(
        self,
        bot_config,
        executed_trade
    ):
        """Test closing trade in sandbox mode"""
        bot_config.simmer_mode = "sandbox"
        mock_db = MagicMock()
        mock_db.update_trade = MagicMock()
        
        executor = TradeExecutor(bot_config, mock_db)
        
        exit_price = Decimal("0.85")
        closed_trade = await executor.close_trade(
            executed_trade.trade_id,
            exit_price,
            outcome="win"
        )
        
        assert closed_trade.exit_price == exit_price
        assert closed_trade.closed_at is not None
        assert closed_trade.realized_pnl is not None
    
    @pytest.mark.asyncio
    async def test_calculate_pnl_winning_trade(self, bot_config, executed_trade):
        """Test P&L calculation for winning trade"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        # Trade bought at 0.60, closes at 1.00 (wins)
        pnl = executor._calculate_pnl(
            executed_trade,
            exit_price=Decimal("1.00"),
            outcome="win"
        )
        
        # Profit = position_size * (1.00 - 0.60)
        expected_profit = executed_trade.position_size * (Decimal("1.00") - executed_trade.entry_price)
        assert pnl == expected_profit
        assert pnl > 0
    
    @pytest.mark.asyncio
    async def test_calculate_pnl_losing_trade(self, bot_config, executed_trade):
        """Test P&L calculation for losing trade"""
        mock_db = MagicMock()
        executor = TradeExecutor(bot_config, mock_db)
        
        # Trade bought at 0.60, closes at 0.00 (loses)
        pnl = executor._calculate_pnl(
            executed_trade,
            exit_price=Decimal("0.00"),
            outcome="loss"
        )
        
        # Loss = position_size * entry_price
        expected_loss = -1 * executed_trade.position_size * executed_trade.entry_price
        assert pnl == expected_loss
        assert pnl < 0
