"""SQLite database for trade tracking and performance monitoring"""

import sqlite3
import logging
from contextlib import contextmanager
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import json

from .models import Trade, TradingSignal, DailyPerformance, RiskMetrics

logger = logging.getLogger(__name__)


class Database:
    """SQLite database with WAL mode for weather trading bot"""
    
    def __init__(self, db_path: str = "weather_bot.db"):
        self.db_path = Path(db_path).expanduser()
        self._is_memory = (db_path == ":memory:")
        self._persistent_conn: Optional[sqlite3.Connection] = None
        
        if not self._is_memory:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._init_schema()
        logger.info(f"Database initialized: {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """Get a database connection with WAL mode.
        
        For :memory: databases, reuses a single persistent connection
        so that tables survive across calls.
        """
        if self._is_memory:
            if self._persistent_conn is None:
                self._persistent_conn = sqlite3.connect(":memory:")
                self._persistent_conn.row_factory = sqlite3.Row
            try:
                yield self._persistent_conn
                self._persistent_conn.commit()
            except Exception:
                self._persistent_conn.rollback()
                raise
            return
        
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row  # Access columns by name
        
        # Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=30000")  # 30 seconds
        
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def _init_schema(self):
        """Create database schema"""
        with self.get_connection() as conn:
            conn.executescript("""
                -- Trades table
                CREATE TABLE IF NOT EXISTS trades (
                    trade_id TEXT PRIMARY KEY,
                    signal_id TEXT,
                    executed_at TEXT NOT NULL,
                    market_id TEXT NOT NULL,
                    market_question TEXT,
                    direction TEXT NOT NULL,
                    position_size REAL NOT NULL,
                    entry_price REAL NOT NULL,
                    exit_price REAL,
                    realized_pnl REAL,
                    unrealized_pnl REAL,
                    status TEXT NOT NULL,
                    closed_at TEXT,
                    notes TEXT,
                    raw_response TEXT
                );
                
                -- Signals table (for tracking signal generation)
                CREATE TABLE IF NOT EXISTS signals (
                    signal_id TEXT PRIMARY KEY,
                    generated_at TEXT NOT NULL,
                    market_id TEXT NOT NULL,
                    market_question TEXT,
                    city TEXT,
                    forecast_date TEXT,
                    direction TEXT NOT NULL,
                    noaa_probability REAL NOT NULL,
                    market_probability REAL NOT NULL,
                    edge REAL NOT NULL,
                    confidence TEXT NOT NULL,
                    confidence_score REAL NOT NULL,
                    recommended_position_size REAL NOT NULL,
                    expected_value REAL NOT NULL,
                    reasoning TEXT,
                    risk_factors TEXT,
                    was_executed BOOLEAN DEFAULT 0
                );
                
                -- Daily performance table
                CREATE TABLE IF NOT EXISTS daily_performance (
                    date TEXT PRIMARY KEY,
                    num_trades INTEGER DEFAULT 0,
                    winning_trades INTEGER DEFAULT 0,
                    losing_trades INTEGER DEFAULT 0,
                    win_rate REAL DEFAULT 0,
                    gross_pnl REAL DEFAULT 0,
                    net_pnl REAL DEFAULT 0,
                    cumulative_pnl REAL DEFAULT 0,
                    max_drawdown REAL DEFAULT 0,
                    largest_win REAL DEFAULT 0,
                    largest_loss REAL DEFAULT 0,
                    starting_capital REAL,
                    ending_capital REAL,
                    roi REAL DEFAULT 0
                );
                
                -- NOAA forecast cache (for accuracy tracking)
                CREATE TABLE IF NOT EXISTS noaa_forecasts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city TEXT NOT NULL,
                    forecast_date TEXT NOT NULL,
                    forecast_generated_at TEXT NOT NULL,
                    forecast_horizon_hours INTEGER,
                    predicted_high_temp REAL,
                    predicted_low_temp REAL,
                    high_temp_confidence REAL,
                    actual_high_temp REAL,
                    actual_low_temp REAL,
                    forecast_error REAL,
                    UNIQUE(city, forecast_date, forecast_generated_at)
                );
                
                -- Indexes
                CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at);
                CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
                CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
                CREATE INDEX IF NOT EXISTS idx_signals_generated_at ON signals(generated_at);
                CREATE INDEX IF NOT EXISTS idx_signals_city ON signals(city);
                CREATE INDEX IF NOT EXISTS idx_noaa_forecasts_city_date ON noaa_forecasts(city, forecast_date);
            """)
    
    # ========== TRADE OPERATIONS ==========
    
    def save_trade(self, trade: Trade):
        """Save or update a trade"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO trades (
                    trade_id, signal_id, executed_at, market_id, market_question,
                    direction, position_size, entry_price, exit_price,
                    realized_pnl, unrealized_pnl, status, closed_at, notes, raw_response
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade.trade_id,
                trade.signal_id,
                trade.executed_at.isoformat(),
                trade.market_id,
                trade.market_question,
                trade.direction.value,
                float(trade.position_size),
                float(trade.entry_price),
                float(trade.exit_price) if trade.exit_price else None,
                float(trade.realized_pnl) if trade.realized_pnl else None,
                float(trade.unrealized_pnl) if trade.unrealized_pnl else None,
                trade.status.value,
                trade.closed_at.isoformat() if trade.closed_at else None,
                trade.notes,
                json.dumps(trade.raw_response),
            ))
        
        logger.info(f"Saved trade: {trade.trade_id} ({trade.status.value})")
    
    def get_active_trades(self) -> List[Trade]:
        """Get all active (non-closed) trades"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM trades 
                WHERE status IN ('pending', 'executed') AND closed_at IS NULL
                ORDER BY executed_at DESC
            """).fetchall()
        
        return [self._row_to_trade(row) for row in rows]
    
    def get_trades(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None
    ) -> List[Trade]:
        """Get trades with optional filters"""
        query = "SELECT * FROM trades WHERE 1=1"
        params = []
        
        if start_date:
            query += " AND executed_at >= ?"
            params.append(start_date.isoformat())
        
        if end_date:
            query += " AND executed_at <= ?"
            params.append(end_date.isoformat())
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY executed_at DESC"
        
        with self.get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
        
        return [self._row_to_trade(row) for row in rows]
    
    def _row_to_trade(self, row: sqlite3.Row) -> Trade:
        """Convert database row to Trade model"""
        from .models import TradeDirection, TradeStatus
        
        return Trade(
            trade_id=row['trade_id'],
            signal_id=row['signal_id'],
            executed_at=datetime.fromisoformat(row['executed_at']),
            market_id=row['market_id'],
            market_question=row['market_question'],
            direction=TradeDirection(row['direction']),
            position_size=Decimal(str(row['position_size'])),
            entry_price=Decimal(str(row['entry_price'])),
            exit_price=Decimal(str(row['exit_price'])) if row['exit_price'] else None,
            realized_pnl=Decimal(str(row['realized_pnl'])) if row['realized_pnl'] else None,
            unrealized_pnl=Decimal(str(row['unrealized_pnl'])) if row['unrealized_pnl'] else None,
            status=TradeStatus(row['status']),
            closed_at=datetime.fromisoformat(row['closed_at']) if row['closed_at'] else None,
            notes=row['notes'],
            raw_response=json.loads(row['raw_response']) if row['raw_response'] else {},
        )
    
    def get_trade(self, trade_id: str) -> Optional[Trade]:
        """Get a single trade by ID"""
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM trades WHERE trade_id = ?", (trade_id,)
            ).fetchone()
        
        if row is None:
            return None
        return self._row_to_trade(row)
    
    def get_all_trades(self) -> List[Trade]:
        """Get all trades"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM trades ORDER BY executed_at DESC"
            ).fetchall()
        return [self._row_to_trade(row) for row in rows]
    
    def get_trades_by_date(self, date) -> List[Trade]:
        """Get trades for a specific date"""
        date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM trades WHERE DATE(executed_at) = ? ORDER BY executed_at DESC",
                (date_str,)
            ).fetchall()
        return [self._row_to_trade(row) for row in rows]
    
    def delete_old_trades(self, days: int = 90) -> int:
        """Delete trades older than N days. Returns count deleted."""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        with self.get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM trades WHERE executed_at < ?", (cutoff,)
            )
            return cursor.rowcount
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        with self.get_connection() as conn:
            total_trades = conn.execute("SELECT COUNT(*) FROM trades").fetchone()[0]
            total_signals = conn.execute("SELECT COUNT(*) FROM signals").fetchone()[0]
            active_trades = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE status IN ('pending', 'executed')"
            ).fetchone()[0]
        return {
            "total_trades": total_trades,
            "total_signals": total_signals,
            "active_trades": active_trades,
        }
    
    def vacuum(self):
        """Vacuum the database to reclaim space"""
        if self._is_memory:
            return
        with self.get_connection() as conn:
            conn.execute("VACUUM")
    
    # ========== SIGNAL OPERATIONS ==========
    
    def save_signal(self, signal: TradingSignal):
        """Save a generated signal"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO signals (
                    signal_id, generated_at, market_id, market_question, city,
                    forecast_date, direction, noaa_probability, market_probability,
                    edge, confidence, confidence_score, recommended_position_size,
                    expected_value, reasoning, risk_factors
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                signal.signal_id,
                signal.generated_at.isoformat(),
                signal.market.market_id,
                signal.market.question,
                signal.market.city,
                signal.market.date.isoformat(),
                signal.direction.value,
                signal.noaa_probability,
                signal.market_probability,
                signal.edge,
                signal.confidence.value,
                signal.confidence_score,
                float(signal.recommended_position_size),
                signal.expected_value,
                signal.reasoning,
                json.dumps(signal.risk_factors),
            ))
    
    def mark_signal_executed(self, signal_id: str):
        """Mark a signal as executed"""
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE signals SET was_executed = 1 WHERE signal_id = ?
            """, (signal_id,))
    
    def get_signal(self, signal_id: str) -> Optional[TradingSignal]:
        """Get a signal by ID"""
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM signals WHERE signal_id = ?", (signal_id,)
            ).fetchone()
        
        if row is None:
            return None
        return self._row_to_signal(row)
    
    def get_signals_by_date(self, date) -> list:
        """Get signals for a specific date"""
        date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM signals WHERE DATE(generated_at) = ? ORDER BY generated_at DESC",
                (date_str,)
            ).fetchall()
        return [self._row_to_signal(row) for row in rows]
    
    def _row_to_signal(self, row: sqlite3.Row) -> TradingSignal:
        """Convert database row to TradingSignal model"""
        from .models import (
            TradingSignal, PolymarketMarket, TradeDirection, ConfidenceLevel, MarketType, NOAAForecast
        )
        
        market = PolymarketMarket(
            market_id=row['market_id'],
            condition_id=row['market_id'],
            question=row['market_question'],
            market_type=MarketType.HIGH_TEMP,
            city=row['city'],
            date=datetime.fromisoformat(row['forecast_date']) if row['forecast_date'] else datetime.now(),
            yes_price=Decimal("0.50"),
            no_price=Decimal("0.50"),
            volume=Decimal("0"),
            liquidity=Decimal("0"),
            created_at=datetime.fromisoformat(row['generated_at']),
        )
        
        forecast_date = datetime.fromisoformat(row['forecast_date']) if row['forecast_date'] else datetime.now()
        noaa_forecast = NOAAForecast(
            city=row['city'],
            latitude=0.0,
            longitude=0.0,
            grid_office="UNK",
            grid_x=0,
            grid_y=0,
            forecast_date=forecast_date,
            forecast_generated_at=datetime.fromisoformat(row['generated_at']),
            forecast_horizon_hours=0,
        )
        
        return TradingSignal(
            signal_id=row['signal_id'],
            generated_at=datetime.fromisoformat(row['generated_at']),
            market=market,
            noaa_forecast=noaa_forecast,
            direction=TradeDirection(row['direction']),
            noaa_probability=row['noaa_probability'],
            market_probability=row['market_probability'],
            edge=row['edge'],
            confidence=ConfidenceLevel(row['confidence']),
            confidence_score=row['confidence_score'],
            recommended_position_size=Decimal(str(row['recommended_position_size'])),
            expected_value=row['expected_value'],
            reasoning=row['reasoning'],
            risk_factors=json.loads(row['risk_factors']) if row['risk_factors'] else [],
            was_executed=bool(row['was_executed']) if 'was_executed' in row.keys() else False,
        )
    
    # ========== PERFORMANCE TRACKING ==========
    
    def calculate_daily_performance(self, date: datetime) -> DailyPerformance:
        """Calculate performance metrics for a specific date"""
        date_str = date.date().isoformat()
        
        with self.get_connection() as conn:
            # Get trades for this date
            trades = conn.execute("""
                SELECT * FROM trades 
                WHERE DATE(executed_at) = ?
            """, (date_str,)).fetchall()
            
            num_trades = len(trades)
            winning_trades = sum(1 for t in trades if t['realized_pnl'] and t['realized_pnl'] > 0)
            losing_trades = sum(1 for t in trades if t['realized_pnl'] and t['realized_pnl'] < 0)
            win_rate = winning_trades / num_trades if num_trades > 0 else 0
            
            gross_pnl = sum(t['realized_pnl'] or 0 for t in trades)
            net_pnl = gross_pnl  # TODO: subtract fees
            
            # Get cumulative P&L
            cumulative_result = conn.execute("""
                SELECT SUM(realized_pnl) as cum_pnl 
                FROM trades 
                WHERE DATE(executed_at) <= ? AND realized_pnl IS NOT NULL
            """, (date_str,)).fetchone()
            cumulative_pnl = cumulative_result['cum_pnl'] or 0
            
            # Calculate largest win/loss
            pnls = [t['realized_pnl'] for t in trades if t['realized_pnl'] is not None]
            largest_win = max(pnls) if pnls else 0
            largest_loss = min(pnls) if pnls else 0
            
            # TODO: Calculate max drawdown properly
            max_drawdown = 0
            
            # TODO: Track capital
            starting_capital = Decimal("500")
            ending_capital = starting_capital + Decimal(str(cumulative_pnl))
            roi = float(cumulative_pnl) / float(starting_capital) if starting_capital > 0 else 0
        
        return DailyPerformance(
            date=date,
            num_trades=num_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            gross_pnl=Decimal(str(gross_pnl)),
            net_pnl=Decimal(str(net_pnl)),
            cumulative_pnl=Decimal(str(cumulative_pnl)),
            max_drawdown=Decimal(str(max_drawdown)),
            largest_win=Decimal(str(largest_win)),
            largest_loss=Decimal(str(largest_loss)),
            starting_capital=starting_capital,
            ending_capital=ending_capital,
            roi=roi,
        )
    
    def get_daily_performance(self, date) -> Optional[DailyPerformance]:
        """Get daily performance for a specific date"""
        dt = datetime.combine(date, datetime.min.time()) if not isinstance(date, datetime) else date
        return self.calculate_daily_performance(dt)
    
    def get_performance_last_n_days(self, n: int = 7) -> List[DailyPerformance]:
        """Get performance for the last N days"""
        results = []
        for i in range(n):
            date = datetime.now() - timedelta(days=i)
            perf = self.calculate_daily_performance(date)
            if perf.num_trades > 0:
                results.append(perf)
        return results
    
    def get_risk_metrics(self) -> RiskMetrics:
        """Calculate current risk metrics"""
        from .models import BotConfig
        config = BotConfig()
        
        with self.get_connection() as conn:
            # Active trades
            active_trades = conn.execute("""
                SELECT * FROM trades WHERE status IN ('pending', 'executed') AND closed_at IS NULL
            """).fetchall()
            
            num_active = len(active_trades)
            total_at_risk = sum(float(t['position_size']) for t in active_trades)
            
            # Today's exposure
            today = datetime.now().date().isoformat()
            today_trades = conn.execute("""
                SELECT SUM(position_size) as exposure 
                FROM trades 
                WHERE DATE(executed_at) = ?
            """, (today,)).fetchone()
            
            current_daily_exposure = Decimal(str(today_trades['exposure'] or 0))
            
            # Performance metrics
            all_trades = conn.execute("""
                SELECT * FROM trades WHERE realized_pnl IS NOT NULL
            """).fetchall()
            
            total_trades = len(all_trades)
            winning = sum(1 for t in all_trades if t['realized_pnl'] > 0)
            losing = sum(1 for t in all_trades if t['realized_pnl'] < 0)
            win_rate = winning / total_trades if total_trades > 0 else 0.5
            
            # Circuit breaker check
            recent_trades = conn.execute("""
                SELECT * FROM trades 
                WHERE realized_pnl IS NOT NULL 
                ORDER BY closed_at DESC 
                LIMIT ?
            """, (config.circuit_breaker_lookback_trades,)).fetchall()
            
            if len(recent_trades) >= config.circuit_breaker_lookback_trades:
                recent_wins = sum(1 for t in recent_trades if t['realized_pnl'] > 0)
                recent_win_rate = recent_wins / len(recent_trades)
                
                if recent_win_rate < config.circuit_breaker_min_win_rate:
                    circuit_breaker_triggered = True
                    circuit_breaker_reason = f"Win rate {recent_win_rate:.1%} below threshold {config.circuit_breaker_min_win_rate:.1%}"
                else:
                    circuit_breaker_triggered = False
                    circuit_breaker_reason = None
            else:
                circuit_breaker_triggered = False
                circuit_breaker_reason = None
        
        return RiskMetrics(
            current_date=datetime.now(),
            max_position_size=config.max_position_size_dollars,
            max_daily_exposure=config.max_daily_exposure_dollars,
            current_daily_exposure=current_daily_exposure,
            remaining_daily_capacity=config.max_daily_exposure_dollars - current_daily_exposure,
            num_active_positions=num_active,
            total_capital_at_risk=Decimal(str(total_at_risk)),
            correlated_positions=num_active,  # TODO: Better correlation detection
            total_trades=total_trades,
            winning_trades=winning,
            losing_trades=losing,
            win_rate=win_rate,
            circuit_breaker_triggered=circuit_breaker_triggered,
            circuit_breaker_reason=circuit_breaker_reason,
        )
    
    # ========== NOAA FORECAST TRACKING ==========
    
    def save_noaa_forecast(self, forecast):
        """Save NOAA forecast for accuracy tracking"""
        from .models import NOAAForecast
        
        if not isinstance(forecast, NOAAForecast):
            return
        
        with self.get_connection() as conn:
            try:
                conn.execute("""
                    INSERT INTO noaa_forecasts (
                        city, forecast_date, forecast_generated_at,
                        forecast_horizon_hours, predicted_high_temp,
                        predicted_low_temp, high_temp_confidence
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    forecast.city,
                    forecast.forecast_date.isoformat(),
                    forecast.forecast_generated_at.isoformat(),
                    forecast.forecast_horizon_hours,
                    forecast.high_temp,
                    forecast.low_temp,
                    forecast.high_temp_confidence,
                ))
            except sqlite3.IntegrityError:
                # Already exists (unique constraint)
                pass
    
    def update_actual_temps(
        self,
        forecast_id: int,
        actual_high: Optional[float] = None,
        actual_low: Optional[float] = None,
    ):
        """Update a forecast record with actual observed temperatures"""
        with self.get_connection() as conn:
            updates = []
            params = []
            if actual_high is not None:
                updates.append("actual_high_temp = ?")
                params.append(actual_high)
            if actual_low is not None:
                updates.append("actual_low_temp = ?")
                params.append(actual_low)
            if actual_high is not None and 'predicted_high_temp' in [
                desc[0] for desc in conn.execute("PRAGMA table_info(noaa_forecasts)").fetchall()
            ]:
                updates.append(
                    "forecast_error = ABS(predicted_high_temp - ?)"
                )
                params.append(actual_high)
            if not updates:
                return
            params.append(forecast_id)
            conn.execute(
                f"UPDATE noaa_forecasts SET {', '.join(updates)} WHERE rowid = ?",
                params,
            )
    
    def get_forecast_accuracy(self) -> Dict:
        """Get forecast accuracy statistics"""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    AVG(forecast_error) as avg_error,
                    MIN(forecast_error) as min_error,
                    MAX(forecast_error) as max_error
                FROM noaa_forecasts
                WHERE forecast_error IS NOT NULL
            """).fetchone()
        return {
            "total_forecasts_with_actuals": row[0] or 0,
            "avg_error": row[1],
            "min_error": row[2],
            "max_error": row[3],
        }
