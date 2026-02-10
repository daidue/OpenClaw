"""Dashboard for bot monitoring and performance tracking"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from decimal import Decimal
from ..database import Database
from ..models import BotConfig

logger = logging.getLogger(__name__)


class Dashboard:
    """Generate monitoring dashboard data"""
    
    def __init__(self, database: Database, config: BotConfig):
        self.db = database
        self.config = config
    
    def get_dashboard_data(self) -> Dict:
        """
        Generate complete dashboard data.
        
        Returns JSON-serializable dict with all metrics.
        """
        return {
            "generated_at": datetime.now().isoformat(),
            "mode": self.config.simmer_mode,
            "status": self._get_status(),
            "performance": self._get_performance_summary(),
            "risk": self._get_risk_summary(),
            "active_positions": self._get_active_positions(),
            "recent_signals": self._get_recent_signals(),
            "recent_trades": self._get_recent_trades(),
        }
    
    def _get_status(self) -> Dict:
        """Get bot operational status"""
        metrics = self.db.get_risk_metrics()
        
        # Determine overall status
        if metrics.circuit_breaker_triggered:
            status = "CIRCUIT_BREAKER"
            message = metrics.circuit_breaker_reason
        elif metrics.num_active_positions >= self.config.max_correlated_positions:
            status = "POSITION_LIMIT"
            message = "Max positions reached"
        elif metrics.current_daily_exposure >= self.config.max_daily_exposure_dollars:
            status = "EXPOSURE_LIMIT"
            message = "Daily exposure limit reached"
        else:
            status = "ACTIVE"
            message = "Bot operational"
        
        return {
            "status": status,
            "message": message,
            "circuit_breaker_triggered": metrics.circuit_breaker_triggered,
        }
    
    def _get_performance_summary(self) -> Dict:
        """Get performance metrics"""
        metrics = self.db.get_risk_metrics()
        
        # Today's performance
        today = datetime.now()
        today_perf = self.db.calculate_daily_performance(today)
        
        # Recent performance (last 7 days)
        week_trades = self.db.get_trades(
            start_date=today - timedelta(days=7),
            end_date=today
        )
        
        week_pnl = sum(
            float(t.realized_pnl) 
            for t in week_trades 
            if t.realized_pnl is not None
        )
        
        return {
            "total_trades": metrics.total_trades,
            "win_rate": f"{metrics.win_rate:.1%}",
            "win_rate_raw": metrics.win_rate,
            "winning_trades": metrics.winning_trades,
            "losing_trades": metrics.losing_trades,
            "today": {
                "num_trades": today_perf.num_trades,
                "pnl": float(today_perf.net_pnl),
                "win_rate": f"{today_perf.win_rate:.1%}" if today_perf.num_trades > 0 else "N/A",
            },
            "last_7_days": {
                "num_trades": len(week_trades),
                "pnl": week_pnl,
            },
            "all_time": {
                "cumulative_pnl": float(today_perf.cumulative_pnl),
                "roi": f"{today_perf.roi:.1%}",
            },
        }
    
    def _get_risk_summary(self) -> Dict:
        """Get risk metrics"""
        metrics = self.db.get_risk_metrics()
        
        exposure_pct = (
            float(metrics.current_daily_exposure / metrics.max_daily_exposure * 100)
            if metrics.max_daily_exposure > 0
            else 0
        )
        
        return {
            "daily_exposure": {
                "current": float(metrics.current_daily_exposure),
                "limit": float(metrics.max_daily_exposure),
                "remaining": float(metrics.remaining_daily_capacity),
                "utilization_pct": exposure_pct,
            },
            "positions": {
                "active": metrics.num_active_positions,
                "max_allowed": self.config.max_correlated_positions,
                "capital_at_risk": float(metrics.total_capital_at_risk),
            },
            "limits": {
                "max_position_size": float(self.config.max_position_size_dollars),
                "max_daily_exposure": float(self.config.max_daily_exposure_dollars),
                "min_edge": f"{self.config.minimum_edge_threshold:.1%}",
                "min_confidence": self.config.minimum_confidence_score,
            },
        }
    
    def _get_active_positions(self) -> List[Dict]:
        """Get active trading positions"""
        active_trades = self.db.get_active_trades()
        
        positions = []
        for trade in active_trades:
            positions.append({
                "trade_id": trade.trade_id,
                "market": trade.market_question,
                "direction": trade.direction.value,
                "size": float(trade.position_size),
                "entry_price": float(trade.entry_price),
                "unrealized_pnl": float(trade.unrealized_pnl) if trade.unrealized_pnl else 0,
                "executed_at": trade.executed_at.isoformat(),
                "status": trade.status.value,
            })
        
        return positions
    
    def _get_recent_signals(self, limit: int = 10) -> List[Dict]:
        """Get recent trading signals"""
        # Query from database
        with self.db.get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM signals 
                ORDER BY generated_at DESC 
                LIMIT ?
            """, (limit,)).fetchall()
        
        signals = []
        for row in rows:
            signals.append({
                "signal_id": row['signal_id'],
                "generated_at": row['generated_at'],
                "market": row['market_question'],
                "city": row['city'],
                "direction": row['direction'],
                "edge": f"{row['edge']:.1%}",
                "confidence": row['confidence'],
                "confidence_score": row['confidence_score'],
                "recommended_size": float(row['recommended_position_size']),
                "expected_value": row['expected_value'],
                "was_executed": bool(row['was_executed']),
            })
        
        return signals
    
    def _get_recent_trades(self, limit: int = 10) -> List[Dict]:
        """Get recent executed trades"""
        trades = self.db.get_trades()[:limit]
        
        trade_list = []
        for trade in trades:
            pnl = float(trade.realized_pnl) if trade.realized_pnl else None
            
            trade_list.append({
                "trade_id": trade.trade_id,
                "executed_at": trade.executed_at.isoformat(),
                "market": trade.market_question,
                "direction": trade.direction.value,
                "size": float(trade.position_size),
                "entry_price": float(trade.entry_price),
                "exit_price": float(trade.exit_price) if trade.exit_price else None,
                "pnl": pnl,
                "pnl_pct": f"{(pnl / float(trade.position_size) * 100):.1f}%" if pnl else None,
                "status": trade.status.value,
                "closed_at": trade.closed_at.isoformat() if trade.closed_at else None,
            })
        
        return trade_list
    
    def export_dashboard_json(self, output_path: str = "dashboard.json"):
        """Export dashboard data to JSON file"""
        data = self.get_dashboard_data()
        
        output_file = Path(output_path)
        output_file.write_text(json.dumps(data, indent=2))
        
        logger.info(f"Dashboard exported to {output_file}")
        return output_file
    
    def print_summary(self):
        """Print human-readable dashboard summary to console"""
        data = self.get_dashboard_data()
        
        print("\n" + "="*60)
        print("📊 POLYMARKET WEATHER BOT DASHBOARD")
        print("="*60)
        
        # Status
        status = data['status']
        status_emoji = "🟢" if status['status'] == "ACTIVE" else "🔴"
        print(f"\n{status_emoji} Status: {status['status']}")
        print(f"   Message: {status['message']}")
        print(f"   Mode: {data['mode']}")
        
        # Performance
        perf = data['performance']
        print(f"\n📈 Performance:")
        print(f"   Total Trades: {perf['total_trades']}")
        print(f"   Win Rate: {perf['win_rate']} ({perf['winning_trades']}W / {perf['losing_trades']}L)")
        print(f"   Today: {perf['today']['num_trades']} trades, ${perf['today']['pnl']:.2f} P&L")
        print(f"   Last 7 Days: {perf['last_7_days']['num_trades']} trades, ${perf['last_7_days']['pnl']:.2f} P&L")
        print(f"   All-Time P&L: ${perf['all_time']['cumulative_pnl']:.2f} ({perf['all_time']['roi']})")
        
        # Risk
        risk = data['risk']
        print(f"\n⚠️  Risk:")
        print(f"   Daily Exposure: ${risk['daily_exposure']['current']:.2f} / ${risk['daily_exposure']['limit']:.2f}")
        print(f"   Utilization: {risk['daily_exposure']['utilization_pct']:.1f}%")
        print(f"   Active Positions: {risk['positions']['active']} / {risk['positions']['max_allowed']}")
        print(f"   Capital at Risk: ${risk['positions']['capital_at_risk']:.2f}")
        
        # Active Positions
        positions = data['active_positions']
        print(f"\n💼 Active Positions ({len(positions)}):")
        if positions:
            for pos in positions[:5]:  # Show max 5
                print(f"   • {pos['market'][:50]}...")
                print(f"     {pos['direction'].upper()} ${pos['size']:.2f} @ {pos['entry_price']}")
        else:
            print("   (none)")
        
        # Recent Signals
        signals = data['recent_signals']
        print(f"\n🎯 Recent Signals ({len(signals)}):")
        for sig in signals[:3]:  # Show top 3
            executed = "✅" if sig['was_executed'] else "⏳"
            print(f"   {executed} {sig['city']} - Edge: {sig['edge']}, Conf: {sig['confidence']}")
        
        print("\n" + "="*60 + "\n")
