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
    
    async def get_weather_events(self, max_events: int = 1000) -> List[Dict]:
        """
        Fetch weather events from Gamma API with pagination.
        
        Uses the Events API which correctly returns weather-related events.
        CLOB API search fails to return weather markets, but Gamma Events API works.
        
        Args:
            max_events: Maximum events to fetch across all pages
            
        Returns:
            List of event dicts containing weather markets
        """
        all_events = []
        offset = 0
        batch_size = 100
        
        # Fetch events in batches with pagination
        while len(all_events) < max_events:
            url = f"{self.GAMMA_BASE}/events"
            params = {
                'closed': 'false',
                'active': 'true',
                'limit': batch_size,
                'offset': offset
            }
            
            data = await self._get(url, params=params)
            
            if not data or len(data) == 0:
                break
            
            all_events.extend(data)
            logger.debug(f"Fetched {len(data)} events (offset={offset}, total={len(all_events)})")
            
            # Stop if we got fewer than requested (last page)
            if len(data) < batch_size:
                break
            
            offset += batch_size
        
        # Filter for weather-related events with strict criteria
        weather_events = []
        
        for event in all_events:
            title = event.get('title', '')
            slug = event.get('slug', '')
            description = event.get('description', '')
            
            # Combined text for matching
            text = f"{title} {slug} {description}".lower()
            
            # Strict weather keywords (avoid political false positives)
            is_weather = any([
                'temperature' in text and ('highest' in text or 'lowest' in text or 'average' in text),
                'precipitation' in text,
                ' rain' in text or 'rainfall' in text,
                ' snow' in text or 'snowfall' in text,
                'earthquake' in text and 'magnitude' in text,
                'hurricane' in text,
                'tornado' in text,
                'volcano' in text and 'erupt' in text,
                'weather' in title.lower(),  # Explicit "weather" in title
                'celsius' in text or 'fahrenheit' in text,
                'arctic' in text and 'ice' in text,
                'climate' in text,
            ])
            
            # Exclude political/war keywords to avoid false positives
            is_political = any([
                'ukraine' in text and 'weather' not in text,
                'russia' in text and 'weather' not in text,
                'nato' in text,
                'election' in text and 'weather' not in text,
                'trump' in text,
                'biden' in text,
                'ceasefire' in text,
            ])
            
            if is_weather and not is_political:
                weather_events.append(event)
        
        logger.info(f"Found {len(weather_events)} weather events from {len(all_events)} total events")
        return weather_events
    
    async def get_all_weather_markets(self) -> List[Dict]:
        """
        Fetch all weather-related markets using Gamma Events API.
        
        Previous implementation used CLOB search which returned 0 markets.
        New implementation uses Gamma Events API which correctly returns all weather markets.
        """
        # Get weather events from Gamma API
        weather_events = await self.get_weather_events(max_events=500)
        
        if not weather_events:
            logger.warning("No weather events found")
            return []
        
        # Extract markets from events
        all_markets = []
        seen_ids = set()
        
        for event in weather_events:
            # Events contain a 'markets' array with market data
            markets = event.get('markets', [])
            
            for market in markets:
                market_id = market.get('condition_id') or market.get('id')
                
                if market_id and market_id not in seen_ids:
                    # Enrich market with event context
                    market['event_slug'] = event.get('slug')
                    market['event_title'] = event.get('title')
                    all_markets.append(market)
                    seen_ids.add(market_id)
        
        logger.info(f"Found {len(all_markets)} unique weather markets from {len(weather_events)} events")
        return all_markets
