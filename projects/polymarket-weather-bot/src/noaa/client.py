"""NOAA Weather API client with caching and rate limiting"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from dataclasses import dataclass, field
import aiohttp

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with expiration"""
    data: Dict
    expires_at: datetime
    
    def is_valid(self) -> bool:
        return datetime.now() < self.expires_at


class NOAAClient:
    """Async NOAA API client with intelligent caching and rate limiting"""
    
    BASE_URL = "https://api.weather.gov"
    USER_AGENT = "PolymarketWeatherBot/1.0 (contact@example.com)"
    
    def __init__(
        self,
        cache_ttl_seconds: int = 1800,  # 30 minutes
        rate_limit_per_second: float = 1.0,  # Conservative 1 req/sec
        request_timeout: int = 15,
    ):
        self.cache_ttl_seconds = cache_ttl_seconds
        self.rate_limit = rate_limit_per_second
        self.request_timeout = request_timeout
        
        # Cache storage
        self._grid_cache: Dict[str, CacheEntry] = {}
        self._forecast_cache: Dict[str, CacheEntry] = {}
        
        # Rate limiting
        self._last_request_time: float = 0
        self._request_lock = asyncio.Lock()
        
        # HTTP session
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            headers={"User-Agent": self.USER_AGENT},
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
                logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
            
            self._last_request_time = asyncio.get_event_loop().time()
    
    async def _get(self, url: str, retries: int = 3) -> Optional[Dict]:
        """Make rate-limited GET request with retries"""
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        await self._rate_limit_wait()
        
        for attempt in range(retries):
            try:
                async with self.session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.debug(f"✓ NOAA API success: {url}")
                        return data
                    elif response.status == 429:
                        # Rate limited - exponential backoff
                        wait_time = min(5 * (2 ** attempt), 30)
                        logger.warning(f"NOAA rate limited, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    elif response.status == 404:
                        logger.warning(f"NOAA 404: {url}")
                        return None
                    else:
                        logger.error(f"NOAA API error {response.status}: {url}")
                        if attempt == retries - 1:
                            return None
                        await asyncio.sleep(2 ** attempt)
            
            except asyncio.TimeoutError:
                logger.error(f"NOAA timeout (attempt {attempt + 1}/{retries}): {url}")
                if attempt == retries - 1:
                    return None
                await asyncio.sleep(2 ** attempt)
            
            except Exception as e:
                logger.error(f"NOAA request failed: {e}")
                if attempt == retries - 1:
                    return None
                await asyncio.sleep(2 ** attempt)
        
        return None
    
    def _get_cache(self, cache: Dict[str, CacheEntry], key: str) -> Optional[Dict]:
        """Get cached data if valid"""
        if key in cache:
            entry = cache[key]
            if entry.is_valid():
                logger.debug(f"Cache HIT: {key}")
                return entry.data
            else:
                logger.debug(f"Cache EXPIRED: {key}")
                del cache[key]
        return None
    
    def _set_cache(self, cache: Dict[str, CacheEntry], key: str, data: Dict):
        """Set cache entry with TTL"""
        expires_at = datetime.now() + timedelta(seconds=self.cache_ttl_seconds)
        cache[key] = CacheEntry(data=data, expires_at=expires_at)
        logger.debug(f"Cache SET: {key} (expires at {expires_at.isoformat()})")
    
    async def get_grid_point(self, latitude: float, longitude: float) -> Optional[Dict]:
        """
        Get NOAA grid point for coordinates.
        
        Returns:
            {
                "properties": {
                    "gridId": "LOT",
                    "gridX": 75,
                    "gridY": 73,
                    "forecastHourly": "https://api.weather.gov/gridpoints/LOT/75,73/forecast/hourly",
                    ...
                }
            }
        """
        cache_key = f"{latitude:.4f},{longitude:.4f}"
        
        # Check cache first
        cached = self._get_cache(self._grid_cache, cache_key)
        if cached:
            return cached
        
        # Fetch from API
        url = f"{self.BASE_URL}/points/{latitude:.4f},{longitude:.4f}"
        data = await self._get(url)
        
        if data:
            self._set_cache(self._grid_cache, cache_key, data)
        
        return data
    
    async def get_hourly_forecast(
        self,
        grid_id: str,
        grid_x: int,
        grid_y: int
    ) -> Optional[Dict]:
        """
        Get hourly forecast for grid point.
        
        Returns:
            {
                "properties": {
                    "periods": [
                        {
                            "number": 1,
                            "startTime": "2026-02-10T14:00:00-06:00",
                            "temperature": 52,
                            "temperatureUnit": "F",
                            "probabilityOfPrecipitation": {
                                "value": 20
                            },
                            ...
                        },
                        ...
                    ]
                }
            }
        """
        cache_key = f"{grid_id}_{grid_x}_{grid_y}_hourly"
        
        # Check cache
        cached = self._get_cache(self._forecast_cache, cache_key)
        if cached:
            return cached
        
        # Fetch from API
        url = f"{self.BASE_URL}/gridpoints/{grid_id}/{grid_x},{grid_y}/forecast/hourly"
        data = await self._get(url)
        
        if data:
            self._set_cache(self._forecast_cache, cache_key, data)
        
        return data
    
    async def get_forecast(
        self,
        grid_id: str,
        grid_x: int,
        grid_y: int
    ) -> Optional[Dict]:
        """
        Get 12-hour period forecast for grid point.
        
        Returns similar structure to hourly but with 12-hour periods
        """
        cache_key = f"{grid_id}_{grid_x}_{grid_y}_forecast"
        
        # Check cache
        cached = self._get_cache(self._forecast_cache, cache_key)
        if cached:
            return cached
        
        # Fetch from API
        url = f"{self.BASE_URL}/gridpoints/{grid_id}/{grid_x},{grid_y}/forecast"
        data = await self._get(url)
        
        if data:
            self._set_cache(self._forecast_cache, cache_key, data)
        
        return data
    
    async def get_forecast_for_location(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[Dict]:
        """
        Convenience method: get forecast for lat/lon (combines grid lookup + forecast fetch).
        
        Returns hourly forecast data or None
        """
        # Step 1: Get grid point
        grid_data = await self.get_grid_point(latitude, longitude)
        if not grid_data or 'properties' not in grid_data:
            logger.error(f"Failed to get grid point for ({latitude}, {longitude})")
            return None
        
        props = grid_data['properties']
        grid_id = props.get('gridId')
        grid_x = props.get('gridX')
        grid_y = props.get('gridY')
        
        if not all([grid_id, grid_x is not None, grid_y is not None]):
            logger.error(f"Invalid grid data: {props}")
            return None
        
        # Step 2: Get hourly forecast
        forecast_data = await self.get_hourly_forecast(grid_id, grid_x, grid_y)
        
        if forecast_data:
            # Attach grid info for reference
            forecast_data['_grid_info'] = {
                'gridId': grid_id,
                'gridX': grid_x,
                'gridY': grid_y,
                'latitude': latitude,
                'longitude': longitude,
            }
        
        return forecast_data
    
    def clear_cache(self):
        """Clear all cached data"""
        self._grid_cache.clear()
        self._forecast_cache.clear()
        logger.info("NOAA cache cleared")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        grid_valid = sum(1 for e in self._grid_cache.values() if e.is_valid())
        forecast_valid = sum(1 for e in self._forecast_cache.values() if e.is_valid())
        
        return {
            'grid_entries': len(self._grid_cache),
            'grid_valid': grid_valid,
            'forecast_entries': len(self._forecast_cache),
            'forecast_valid': forecast_valid,
            'total_entries': len(self._grid_cache) + len(self._forecast_cache),
            'total_valid': grid_valid + forecast_valid,
        }
