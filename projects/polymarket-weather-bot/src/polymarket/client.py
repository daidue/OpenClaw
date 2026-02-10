"""Polymarket CLOB API client for weather markets"""

import asyncio
import logging
from typing import List, Dict, Optional, Union
from decimal import Decimal
import aiohttp

logger = logging.getLogger(__name__)


class PolymarketClient:
    """Async client for Polymarket CLOB API"""
    
    CLOB_BASE = "https://clob.polymarket.com"
    GAMMA_BASE = "https://gamma-api.polymarket.com"
    
    def __init__(
        self,
        rate_limit_per_second: float = 5.0,
        request_timeout: int = 15
    ):
        self.rate_limit = rate_limit_per_second
        self.request_timeout = request_timeout
        
        # Rate limiting
        self._last_request_time: float = 0
        self._request_lock = asyncio.Lock()
        
        # HTTP session
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.request_timeout)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _rate_limit_wait(self):
        """Enforce rate limiting"""
        async with self._request_lock:
            now = asyncio.get_event_loop().time()
            time_since_last = now - self._last_request_time
            min_interval = 1.0 / self.rate_limit
            
            if time_since_last < min_interval:
                wait_time = min_interval - time_since_last
                logger.debug(f"Polymarket rate limit: waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
            
            self._last_request_time = asyncio.get_event_loop().time()
    
    async def _get(self, url: str, params: Dict = None, retries: int = 3) -> Optional[Union[Dict, List]]:
        """Make rate-limited GET request with retries"""
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        await self._rate_limit_wait()
        
        for attempt in range(retries):
            try:
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.debug(f"✓ Polymarket API success: {url}")
                        return data
                    elif response.status == 429:
                        wait_time = min(5 * (2 ** attempt), 30)
                        logger.warning(f"Polymarket rate limited, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    elif response.status == 404:
                        logger.warning(f"Polymarket 404: {url}")
                        return None
                    else:
                        logger.error(f"Polymarket API error {response.status}: {url}")
                        if attempt == retries - 1:
                            return None
                        await asyncio.sleep(2 ** attempt)
            
            except asyncio.TimeoutError:
                logger.error(f"Polymarket timeout (attempt {attempt + 1}/{retries}): {url}")
                if attempt == retries - 1:
                    return None
                await asyncio.sleep(2 ** attempt)
            
            except Exception as e:
                logger.error(f"Polymarket request failed: {e}")
                if attempt == retries - 1:
                    return None
                await asyncio.sleep(2 ** attempt)
        
        return None
    
    async def get_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        active: bool = True
    ) -> List[Dict]:
        """
        Fetch markets from CLOB API.
        
        Returns:
            List of market dicts with structure:
            {
                "condition_id": "0x...",
                "question": "Highest temperature in NYC on Feb 10?",
                "market_slug": "highest-temperature-in-nyc-on-feb-10",
                "active": true,
                ...
            }
        """
        url = f"{self.CLOB_BASE}/markets"
        params = {
            'limit': limit,
            'offset': offset,
        }
        
        if active:
            params['active'] = 'true'
        
        data = await self._get(url, params=params)
        
        if isinstance(data, list):
            return [m for m in data if not m.get('closed', False)]
        elif isinstance(data, dict) and 'data' in data:
            return [m for m in data['data'] if not m.get('closed', False)]
        else:
            logger.warning(f"Unexpected market data structure: {type(data)}")
            return []
    
    async def search_markets(self, query: str, limit: int = 50) -> List[Dict]:
        """
        Search markets by query string.
        
        Args:
            query: Search term (e.g., "weather", "temperature", "NYC")
            limit: Max results
        
        Returns:
            List of matching markets
        """
        url = f"{self.CLOB_BASE}/markets"
        params = {
            'limit': limit,
            'closed': 'false',
        }
        
        # Some APIs support search param, try it
        all_markets = await self._get(url, params=params)
        
        if not all_markets:
            return []
        
        if isinstance(all_markets, dict) and 'data' in all_markets:
            all_markets = all_markets['data']
        
        # Client-side filtering by question text
        query_lower = query.lower()
        matching = [
            m for m in all_markets
            if query_lower in m.get('question', '').lower() or
               query_lower in m.get('description', '').lower()
        ]
        
        return matching
    
    async def get_market(self, condition_id: str) -> Optional[Dict]:
        """Get single market by condition ID"""
        url = f"{self.CLOB_BASE}/markets/{condition_id}"
        return await self._get(url)
    
    async def get_market_prices(self, condition_id: str) -> Optional[Dict]:
        """
        Get current prices for a market.
        
        Returns:
            {
                "market": "0x...",
                "timestamp": 1234567890,
                "tokens": [
                    {
                        "token_id": "0x...",
                        "price": "0.65",
                        "outcome": "Yes"
                    },
                    {
                        "token_id": "0x...",
                        "price": "0.35",
                        "outcome": "No"
                    }
                ]
            }
        """
        url = f"{self.CLOB_BASE}/prices"
        params = {'market': condition_id}
        return await self._get(url, params=params)
    
    async def get_orderbook(
        self,
        token_id: str,
        side: str = 'both'
    ) -> Optional[Dict]:
        """
        Get orderbook for a token.
        
        Args:
            token_id: Token ID
            side: 'buy', 'sell', or 'both'
        
        Returns:
            {
                "bids": [
                    {"price": "0.65", "size": "100.0"},
                    ...
                ],
                "asks": [
                    {"price": "0.67", "size": "50.0"},
                    ...
                ]
            }
        """
        url = f"{self.CLOB_BASE}/book"
        params = {'token_id': token_id}
        return await self._get(url, params=params)
    
    async def get_all_weather_markets(self) -> List[Dict]:
        """
        Fetch all weather-related markets.
        
        Searches for markets containing weather keywords
        """
        weather_keywords = [
            'temperature',
            'weather',
            'rain',
            'snow',
            'precipitation',
        ]
        
        all_weather_markets = []
        seen_ids = set()
        
        for keyword in weather_keywords:
            markets = await self.search_markets(keyword, limit=100)
            
            for market in markets:
                market_id = market.get('condition_id') or market.get('id')
                if market_id and market_id not in seen_ids:
                    all_weather_markets.append(market)
                    seen_ids.add(market_id)
        
        logger.info(f"Found {len(all_weather_markets)} unique weather markets")
        return all_weather_markets
