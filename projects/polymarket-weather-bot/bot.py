#!/usr/bin/env python3
"""
Polymarket Weather Trading Bot - Main Orchestrator

Production-grade automated trading bot that finds mispricings in Polymarket
weather markets by comparing NOAA forecast data against market prices.

Phase 1: Sandbox mode for testing and validation.
"""

import asyncio
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.models import BotConfig, TradingSignal
from src.database import Database
from src.noaa import NOAAClient, NOAAParser, get_all_cities
from src.polymarket import PolymarketClient, PolymarketParser
from src.signal import SignalEngine
from src.trading import TradeExecutor, RiskManager
from src.monitoring import Dashboard

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class WeatherTradingBot:
    """Main bot orchestrator"""
    
    def __init__(self, config: BotConfig):
        self.config = config
        self.db = Database()
        self.risk_manager = RiskManager(config, self.db)
        self.signal_engine = SignalEngine(config)
        self.executor = TradeExecutor(config)
        self.dashboard = Dashboard(self.db, config)
        
        logger.info(f"🤖 Weather Trading Bot initialized (mode: {config.simmer_mode})")
    
    async def run_cycle(self):
        """
        Run one complete trading cycle:
        1. Fetch NOAA forecasts
        2. Fetch Polymarket markets
        3. Generate signals
        4. Filter through risk management
        5. Execute approved trades
        6. Update dashboard
        """
        logger.info("="*60)
        logger.info("🔄 Starting trading cycle")
        logger.info("="*60)
        
        try:
            # Step 1: Fetch NOAA forecasts
            logger.info("📡 Fetching NOAA forecasts...")
            forecasts = await self._fetch_noaa_forecasts()
            logger.info(f"✓ Retrieved {len(forecasts)} forecasts")
            
            # Step 2: Fetch Polymarket weather markets
            logger.info("📡 Fetching Polymarket markets...")
            markets = await self._fetch_polymarket_markets()
            logger.info(f"✓ Retrieved {len(markets)} weather markets")
            
            # Step 3: Generate trading signals
            logger.info("🎯 Generating trading signals...")
            signals = self.signal_engine.generate_signals(forecasts, markets)
            logger.info(f"✓ Generated {len(signals)} signals")
            
            # Save signals to database
            for signal in signals:
                self.db.save_signal(signal)
            
            # Step 4: Risk management filter
            logger.info("⚠️  Filtering through risk management...")
            approved_signals, rejected_signals = self.risk_manager.filter_signals(signals)
            logger.info(
                f"✓ Risk filter: {len(approved_signals)} approved, "
                f"{len(rejected_signals)} rejected"
            )
            
            # Log rejection reasons
            for signal, reason in rejected_signals:
                logger.info(f"   ✗ {signal.market.city}: {reason}")
            
            # Step 5: Execute approved signals
            if approved_signals:
                logger.info(f"💰 Executing {len(approved_signals)} trades...")
                for signal in approved_signals:
                    await self._execute_signal(signal)
            else:
                logger.info("💤 No signals to execute this cycle")
            
            # Step 6: Update dashboard
            logger.info("📊 Updating dashboard...")
            self.dashboard.export_dashboard_json()
            self.dashboard.print_summary()
            
            logger.info("="*60)
            logger.info("✅ Trading cycle complete")
            logger.info("="*60)
        
        except Exception as e:
            logger.error(f"❌ Error in trading cycle: {e}", exc_info=True)
            raise
    
    async def _fetch_noaa_forecasts(self) -> List:
        """Fetch NOAA forecasts for all tracked cities"""
        cities = get_all_cities()
        forecasts = []
        
        # Target date: tomorrow (most liquid markets are 1-2 days ahead)
        target_date = datetime.now() + timedelta(days=1)
        
        async with NOAAClient(
            cache_ttl_seconds=self.config.noaa_cache_ttl_seconds,
            rate_limit_per_second=1.0,
            request_timeout=self.config.noaa_request_timeout_seconds
        ) as client:
            # Fetch forecasts concurrently
            tasks = [
                client.get_forecast_for_location(city.latitude, city.longitude)
                for city in cities
            ]
            
            forecast_data_list = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Parse forecasts
            for city, forecast_data in zip(cities, forecast_data_list):
                if isinstance(forecast_data, Exception):
                    logger.warning(f"Failed to fetch forecast for {city.name}: {forecast_data}")
                    continue
                
                if not forecast_data:
                    logger.warning(f"No forecast data for {city.name}")
                    continue
                
                # Parse forecast
                forecast = NOAAParser.extract_forecast_for_date(
                    forecast_data,
                    target_date,
                    city.name
                )
                
                if forecast:
                    forecasts.append(forecast)
                    # Save to database for accuracy tracking
                    self.db.save_noaa_forecast(forecast)
                else:
                    logger.warning(f"Could not parse forecast for {city.name}")
        
        return forecasts
    
    async def _fetch_polymarket_markets(self) -> List:
        """Fetch and parse Polymarket weather markets"""
        async with PolymarketClient(
            rate_limit_per_second=self.config.polymarket_rate_limit_per_second
        ) as client:
            # Fetch all weather markets
            raw_markets = await client.get_all_weather_markets()
            
            # Parse into structured format
            parsed_markets = []
            for market_data in raw_markets:
                market = PolymarketParser.parse_weather_market(market_data)
                if market:
                    parsed_markets.append(market)
            
            # Filter to tradeable markets
            tradeable = PolymarketParser.filter_tradeable_markets(
                parsed_markets,
                min_liquidity=self.config.minimum_liquidity,
                max_days_ahead=7
            )
            
            return tradeable
    
    async def _execute_signal(self, signal: TradingSignal):
        """Execute a trading signal"""
        try:
            # Execute trade
            trade = await self.executor.execute_signal(signal)
            
            # Save to database
            self.db.save_trade(trade)
            
            # Mark signal as executed
            self.db.mark_signal_executed(signal.signal_id)
            
            logger.info(
                f"✅ Trade executed successfully: {trade.trade_id} - "
                f"{trade.direction.value} {trade.market_question[:50]}..."
            )
        
        except Exception as e:
            logger.error(f"❌ Failed to execute signal {signal.signal_id}: {e}", exc_info=True)
    
    async def run_continuous(self, interval_seconds: int = 3600):
        """
        Run bot continuously with specified interval.
        
        Args:
            interval_seconds: Time between cycles (default 1 hour)
        """
        logger.info(f"🚀 Starting continuous operation (interval: {interval_seconds}s)")
        
        while True:
            try:
                await self.run_cycle()
                
                # Wait for next cycle
                logger.info(f"⏳ Waiting {interval_seconds}s until next cycle...")
                await asyncio.sleep(interval_seconds)
            
            except KeyboardInterrupt:
                logger.info("⏹️  Bot stopped by user")
                break
            
            except Exception as e:
                logger.error(f"❌ Unexpected error: {e}", exc_info=True)
                logger.info("⏳ Waiting 60s before retry...")
                await asyncio.sleep(60)


async def main():
    """Main entry point"""
    # Load configuration
    config = BotConfig()
    
    # Create bot
    bot = WeatherTradingBot(config)
    
    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--once":
            # Run single cycle
            logger.info("Running single cycle (--once mode)")
            await bot.run_cycle()
        elif sys.argv[1] == "--dashboard":
            # Just show dashboard
            logger.info("Dashboard mode")
            bot.dashboard.print_summary()
            bot.dashboard.export_dashboard_json()
        else:
            print("Usage: python bot.py [--once | --dashboard]")
            print("  --once: Run single cycle and exit")
            print("  --dashboard: Show dashboard and exit")
            print("  (no args): Run continuously")
            sys.exit(1)
    else:
        # Run continuously (default)
        await bot.run_continuous(interval_seconds=config.noaa_update_interval_seconds)


if __name__ == "__main__":
    asyncio.run(main())
