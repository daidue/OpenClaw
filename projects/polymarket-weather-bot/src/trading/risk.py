"""Risk management module - enforces position limits and circuit breakers"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from ..models import BotConfig, TradingSignal, RiskMetrics
from ..database import Database

logger = logging.getLogger(__name__)


class RiskManager:
    """Enforce risk management rules"""
    
    def __init__(self, config: BotConfig, database: Database):
        self.config = config
        self.db = database
    
    def check_signal(self, signal: TradingSignal) -> tuple[bool, Optional[str]]:
        """
        Check if a signal passes risk management checks.
        
        Returns:
            (approved, rejection_reason)
        """
        # Get current risk metrics
        metrics = self.db.get_risk_metrics()
        
        # Check 1: Circuit breaker
        if metrics.circuit_breaker_triggered:
            return False, f"Circuit breaker: {metrics.circuit_breaker_reason}"
        
        # Check 2: Daily exposure limit
        required_capital = signal.recommended_position_size
        if metrics.current_daily_exposure + required_capital > self.config.max_daily_exposure_dollars:
            return False, (
                f"Daily exposure limit: "
                f"current={metrics.current_daily_exposure}, "
                f"would add={required_capital}, "
                f"limit={self.config.max_daily_exposure_dollars}"
            )
        
        # Check 3: Position size limit
        if required_capital > self.config.max_position_size_dollars:
            return False, (
                f"Position size exceeds limit: "
                f"{required_capital} > {self.config.max_position_size_dollars}"
            )
        
        # Check 4: Max correlated positions
        if metrics.num_active_positions >= self.config.max_correlated_positions:
            return False, (
                f"Too many active positions: "
                f"{metrics.num_active_positions} >= {self.config.max_correlated_positions}"
            )
        
        # Check 5: Minimum liquidity
        if signal.market.liquidity < self.config.minimum_liquidity:
            return False, (
                f"Insufficient market liquidity: "
                f"{signal.market.liquidity} < {self.config.minimum_liquidity}"
            )
        
        # Check 6: Minimum edge
        if signal.edge < self.config.minimum_edge_threshold:
            return False, (
                f"Edge below threshold: "
                f"{signal.edge:.2%} < {self.config.minimum_edge_threshold:.2%}"
            )
        
        # Check 7: Minimum confidence
        if signal.confidence_score < self.config.minimum_confidence_score:
            return False, (
                f"Confidence below threshold: "
                f"{signal.confidence_score:.2f} < {self.config.minimum_confidence_score:.2f}"
            )
        
        # All checks passed
        logger.info(f"✓ Signal passed risk checks: {signal.signal_id}")
        return True, None
    
    def filter_signals(
        self,
        signals: List[TradingSignal]
    ) -> tuple[List[TradingSignal], List[tuple[TradingSignal, str]]]:
        """
        Filter signals through risk management.
        
        Returns:
            (approved_signals, rejected_signals_with_reasons)
        """
        approved = []
        rejected = []
        
        for signal in signals:
            passed, reason = self.check_signal(signal)
            
            if passed:
                approved.append(signal)
            else:
                rejected.append((signal, reason))
                logger.info(f"✗ Signal rejected: {signal.signal_id} - {reason}")
        
        logger.info(
            f"Risk filter: {len(approved)} approved, {len(rejected)} rejected "
            f"(from {len(signals)} total)"
        )
        
        return approved, rejected
    
    def should_close_position(
        self,
        entry_price: Decimal,
        current_price: Decimal
    ) -> tuple[bool, Optional[str]]:
        """
        Check if position should be closed (stop-loss, take-profit, etc.)
        
        Returns:
            (should_close, reason)
        """
        # Calculate P&L percentage
        pnl_pct = float((current_price - entry_price) / entry_price)
        
        # Stop-loss check
        if pnl_pct <= -self.config.stop_loss_percent:
            return True, f"Stop-loss triggered: {pnl_pct:.1%} loss"
        
        # Could add take-profit logic here
        # For now, let positions ride to market resolution
        
        return False, None
    
    def get_risk_summary(self) -> dict:
        """Get human-readable risk summary"""
        metrics = self.db.get_risk_metrics()
        
        return {
            "circuit_breaker": {
                "triggered": metrics.circuit_breaker_triggered,
                "reason": metrics.circuit_breaker_reason,
            },
            "exposure": {
                "current": float(metrics.current_daily_exposure),
                "limit": float(metrics.max_daily_exposure),
                "remaining": float(metrics.remaining_daily_capacity),
                "utilization_pct": float(
                    metrics.current_daily_exposure / metrics.max_daily_exposure * 100
                ) if metrics.max_daily_exposure > 0 else 0,
            },
            "positions": {
                "active": metrics.num_active_positions,
                "max_allowed": self.config.max_correlated_positions,
                "capital_at_risk": float(metrics.total_capital_at_risk),
            },
            "performance": {
                "total_trades": metrics.total_trades,
                "win_rate": f"{metrics.win_rate:.1%}",
                "winning": metrics.winning_trades,
                "losing": metrics.losing_trades,
            },
        }
