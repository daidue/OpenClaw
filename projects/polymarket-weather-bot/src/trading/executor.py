"""Trade execution via Simmer SDK (sandbox mode for Phase 1)"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from ..models import (
    TradingSignal,
    Trade,
    TradeDirection,
    TradeStatus,
    BotConfig,
)

logger = logging.getLogger(__name__)


class TradeExecutor:
    """Execute trades via Simmer SDK"""
    
    def __init__(self, config: BotConfig):
        self.config = config
        self.simmer_available = self._check_simmer_sdk()
    
    def _check_simmer_sdk(self) -> bool:
        """Check if Simmer SDK is installed and configured"""
        try:
            import simmer_sdk
            logger.info("✓ Simmer SDK found")
            return True
        except ImportError:
            logger.warning(
                "⚠ Simmer SDK not found. Install with: pip install simmer-sdk\n"
                "For Phase 1 sandbox testing, trades will be simulated."
            )
            return False
    
    async def execute_signal(self, signal: TradingSignal) -> Trade:
        """
        Execute a trading signal.
        
        In Phase 1 (sandbox), this simulates the trade.
        In production, this would call Simmer SDK to place real orders.
        
        Returns:
            Trade record
        """
        trade_id = f"trade_{uuid.uuid4().hex[:8]}"
        
        logger.info(
            f"🔄 Executing trade {trade_id}: "
            f"{signal.direction.value.upper()} {signal.market.city} "
            f"for ${signal.recommended_position_size}"
        )
        
        if self.config.simmer_mode == "sandbox":
            # Sandbox mode - simulate trade
            trade = await self._simulate_trade(signal, trade_id)
        else:
            # Production mode - execute via Simmer SDK
            trade = await self._execute_real_trade(signal, trade_id)
        
        logger.info(
            f"✅ Trade executed: {trade.trade_id} - "
            f"{trade.direction.value} @ {trade.entry_price}"
        )
        
        return trade
    
    async def _simulate_trade(
        self,
        signal: TradingSignal,
        trade_id: str
    ) -> Trade:
        """
        Simulate a trade for sandbox testing.
        
        This creates a Trade record with simulated execution.
        Actual P&L will be calculated when market resolves.
        """
        entry_price = (
            signal.market.yes_price 
            if signal.direction == TradeDirection.BUY 
            else signal.market.no_price
        )
        
        trade = Trade(
            trade_id=trade_id,
            signal_id=signal.signal_id,
            executed_at=datetime.now(),
            market_id=signal.market.market_id,
            market_question=signal.market.question,
            direction=signal.direction,
            position_size=signal.recommended_position_size,
            entry_price=entry_price,
            exit_price=None,
            realized_pnl=None,
            unrealized_pnl=None,
            status=TradeStatus.EXECUTED,
            closed_at=None,
            notes=f"Sandbox simulation - {signal.reasoning}",
            raw_response={
                "mode": "sandbox",
                "simulated": True,
                "signal_id": signal.signal_id,
            },
        )
        
        return trade
    
    async def _execute_real_trade(
        self,
        signal: TradingSignal,
        trade_id: str
    ) -> Trade:
        """
        Execute real trade via Simmer SDK.
        
        This is a placeholder for production implementation.
        Requires Simmer SDK configuration and API keys.
        """
        if not self.simmer_available:
            raise RuntimeError(
                "Cannot execute real trades: Simmer SDK not installed. "
                "Install with: pip install simmer-sdk"
            )
        
        # TODO: Implement Simmer SDK integration
        # Example flow (based on Simmer docs):
        #
        # from simmer_sdk import SimmerClient
        # 
        # client = SimmerClient(
        #     api_key=os.getenv("SIMMER_API_KEY"),
        #     mode="production"  # or "training"
        # )
        # 
        # # Place order on Polymarket via Simmer
        # order = await client.place_order(
        #     market_id=signal.market.market_id,
        #     side="buy" if signal.direction == TradeDirection.BUY else "sell",
        #     amount=float(signal.recommended_position_size),
        #     price=float(signal.market.yes_price),
        # )
        # 
        # # Create Trade record from response
        # trade = Trade(
        #     trade_id=trade_id,
        #     signal_id=signal.signal_id,
        #     executed_at=datetime.now(),
        #     market_id=signal.market.market_id,
        #     market_question=signal.market.question,
        #     direction=signal.direction,
        #     position_size=Decimal(str(order['filled_amount'])),
        #     entry_price=Decimal(str(order['avg_price'])),
        #     status=TradeStatus.EXECUTED,
        #     raw_response=order,
        # )
        
        logger.error("Real trading not yet implemented - use sandbox mode")
        raise NotImplementedError("Production trading requires Simmer SDK setup")
    
    async def close_position(self, trade: Trade, exit_price: Decimal) -> Trade:
        """
        Close an open position.
        
        In sandbox mode, this just updates the trade record.
        In production, this would place a closing order via Simmer.
        """
        logger.info(
            f"🔄 Closing position {trade.trade_id}: "
            f"entry={trade.entry_price}, exit={exit_price}"
        )
        
        # Calculate P&L
        if trade.direction == TradeDirection.BUY:
            # Bought YES shares, now selling them
            pnl = (exit_price - trade.entry_price) * trade.position_size
        else:
            # Sold (or bought NO), inverse P&L
            pnl = (trade.entry_price - exit_price) * trade.position_size
        
        # Update trade
        trade.exit_price = exit_price
        trade.realized_pnl = pnl
        trade.status = TradeStatus.EXECUTED  # Mark as closed
        trade.closed_at = datetime.now()
        trade.notes = f"{trade.notes}\nClosed at {exit_price} - P&L: {pnl}"
        
        logger.info(
            f"✅ Position closed: {trade.trade_id} - "
            f"P&L: ${pnl:.2f} ({(pnl/float(trade.position_size)*100):.1f}%)"
        )
        
        return trade
    
    def calculate_unrealized_pnl(
        self,
        trade: Trade,
        current_price: Decimal
    ) -> Decimal:
        """Calculate unrealized P&L for an open position"""
        if trade.direction == TradeDirection.BUY:
            pnl = (current_price - trade.entry_price) * trade.position_size
        else:
            pnl = (trade.entry_price - current_price) * trade.position_size
        
        return pnl
