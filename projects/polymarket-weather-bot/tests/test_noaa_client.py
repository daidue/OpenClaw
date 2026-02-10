"""Tests for NOAA API client"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from src.noaa.client import NOAAClient, CacheEntry


class TestCacheEntry:
    """Test cache entry class"""
    
    def test_valid_cache_entry(self):
        """Test valid cache entry"""
        entry = CacheEntry(
            data={"test": "data"},
            expires_at=datetime.now() + timedelta(minutes=30),
        )
        assert entry.is_valid()
        assert entry.data == {"test": "data"}
    
    def test_expired_cache_entry(self):
        """Test expired cache entry"""
        entry = CacheEntry(
            data={"test": "data"},
            expires_at=datetime.now() - timedelta(minutes=1),
        )
        assert not entry.is_valid()


class TestNOAAClient:
    """Test NOAA client"""
    
    @pytest.mark.asyncio
    async def test_client_initialization(self):
        """Test client initialization"""
        async with NOAAClient() as client:
            assert client.cache_ttl_seconds == 1800
            assert client.rate_limit == 1.0
            assert client.session is not None
    
    @pytest.mark.asyncio
    async def test_client_context_manager(self):
        """Test async context manager"""
        client = NOAAClient()
        assert client.session is None
        
        async with client:
            assert client.session is not None
        
        # Session should be closed after exiting context
        assert client.session.closed
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """Test rate limiting enforcement"""
        client = NOAAClient(rate_limit_per_second=10.0)
        
        start_time = asyncio.get_event_loop().time()
        
        # Make 3 rapid requests
        await client._rate_limit_wait()
        await client._rate_limit_wait()
        await client._rate_limit_wait()
        
        end_time = asyncio.get_event_loop().time()
        elapsed = end_time - start_time
        
        # Should take at least 0.2 seconds (2 intervals at 10 req/sec)
        assert elapsed >= 0.15
    
    @pytest.mark.asyncio
    async def test_get_grid_point_success(self, noaa_api_response_grid):
        """Test successful grid point lookup"""
        async with NOAAClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                # Mock response
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=noaa_api_response_grid)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                result = await client.get_grid_point(40.7128, -74.0060)
                
                assert result == noaa_api_response_grid
                assert result['properties']['gridId'] == 'OKX'
    
    @pytest.mark.asyncio
    async def test_get_grid_point_cached(self, noaa_api_response_grid):
        """Test grid point lookup uses cache"""
        async with NOAAClient(cache_ttl_seconds=3600) as client:
            with patch.object(client.session, 'get') as mock_get:
                # Mock response
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=noaa_api_response_grid)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                # First call - should hit API
                result1 = await client.get_grid_point(40.7128, -74.0060)
                assert mock_get.call_count == 1
                
                # Second call - should use cache
                result2 = await client.get_grid_point(40.7128, -74.0060)
                assert mock_get.call_count == 1  # No additional API call
                
                assert result1 == result2
    
    @pytest.mark.asyncio
    async def test_get_grid_point_404(self):
        """Test grid point lookup with 404 response"""
        async with NOAAClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 404
                mock_get.return_value.__aenter__.return_value = mock_response
                
                result = await client.get_grid_point(0.0, 0.0)
                assert result is None
    
    @pytest.mark.asyncio
    async def test_get_hourly_forecast_success(self, noaa_api_response_forecast):
        """Test successful hourly forecast fetch"""
        async with NOAAClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=noaa_api_response_forecast)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                result = await client.get_hourly_forecast("OKX", 33, 35)
                
                assert result == noaa_api_response_forecast
                assert 'properties' in result
                assert 'periods' in result['properties']
    
    @pytest.mark.asyncio
    async def test_get_hourly_forecast_cached(self, noaa_api_response_forecast):
        """Test hourly forecast uses cache"""
        async with NOAAClient(cache_ttl_seconds=3600) as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=noaa_api_response_forecast)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                # First call
                await client.get_hourly_forecast("OKX", 33, 35)
                assert mock_get.call_count == 1
                
                # Second call should use cache
                await client.get_hourly_forecast("OKX", 33, 35)
                assert mock_get.call_count == 1
    
    @pytest.mark.asyncio
    async def test_get_forecast_for_location(self, noaa_api_response_grid, noaa_api_response_forecast):
        """Test combined grid + forecast lookup"""
        async with NOAAClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                def mock_response_factory(url, *args, **kwargs):
                    mock_resp = AsyncMock()
                    mock_resp.status = 200
                    
                    if '/points/' in str(url):
                        mock_resp.json = AsyncMock(return_value=noaa_api_response_grid)
                    elif '/forecast/hourly' in str(url):
                        mock_resp.json = AsyncMock(return_value=noaa_api_response_forecast)
                    else:
                        mock_resp.json = AsyncMock(return_value={})
                    
                    cm = AsyncMock()
                    cm.__aenter__.return_value = mock_resp
                    return cm
                
                mock_get.side_effect = mock_response_factory
                
                result = await client.get_forecast_for_location(40.7128, -74.0060)
                
                # Should have both grid info and forecast data
                assert result is not None
                assert '_grid_info' in result
                assert result['_grid_info']['gridId'] == 'OKX'
    
    @pytest.mark.asyncio
    async def test_get_request_with_retries(self):
        """Test retry logic on failures"""
        async with NOAAClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                # First two attempts fail, third succeeds
                responses = [
                    AsyncMock(status=500),
                    AsyncMock(status=500),
                    AsyncMock(status=200, json=AsyncMock(return_value={"success": True})),
                ]
                
                mock_get.return_value.__aenter__.side_effect = responses
                
                result = await client._get("https://test.com")
                
                assert result == {"success": True}
                assert mock_get.call_count == 3
    
    @pytest.mark.asyncio
    async def test_get_request_timeout(self):
        """Test timeout handling"""
        async with NOAAClient(request_timeout=1) as client:
            with patch.object(client.session, 'get') as mock_get:
                # Simulate timeout
                mock_get.return_value.__aenter__.side_effect = asyncio.TimeoutError()
                
                result = await client._get("https://test.com", retries=2)
                
                assert result is None
                assert mock_get.call_count == 2
    
    @pytest.mark.asyncio
    async def test_rate_limit_429_response(self):
        """Test handling of 429 rate limit response"""
        async with NOAAClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                # 429 response followed by success
                responses = [
                    AsyncMock(status=429),
                    AsyncMock(status=200, json=AsyncMock(return_value={"success": True})),
                ]
                
                mock_get.return_value.__aenter__.side_effect = responses
                
                with patch('asyncio.sleep', new_callable=AsyncMock):
                    result = await client._get("https://test.com")
                
                assert result == {"success": True}
    
    def test_cache_statistics(self):
        """Test cache statistics tracking"""
        client = NOAAClient()
        
        # Add some cache entries
        client._grid_cache["key1"] = CacheEntry(
            data={"test": 1},
            expires_at=datetime.now() + timedelta(hours=1),
        )
        client._grid_cache["key2"] = CacheEntry(
            data={"test": 2},
            expires_at=datetime.now() - timedelta(hours=1),  # Expired
        )
        client._forecast_cache["key3"] = CacheEntry(
            data={"test": 3},
            expires_at=datetime.now() + timedelta(hours=1),
        )
        
        stats = client.get_cache_stats()
        
        assert stats['grid_entries'] == 2
        assert stats['grid_valid'] == 1  # One expired
        assert stats['forecast_entries'] == 1
        assert stats['forecast_valid'] == 1
        assert stats['total_entries'] == 3
        assert stats['total_valid'] == 2
    
    def test_clear_cache(self):
        """Test cache clearing"""
        client = NOAAClient()
        
        # Add cache entries
        client._grid_cache["key1"] = CacheEntry(
            data={"test": 1},
            expires_at=datetime.now() + timedelta(hours=1),
        )
        client._forecast_cache["key2"] = CacheEntry(
            data={"test": 2},
            expires_at=datetime.now() + timedelta(hours=1),
        )
        
        assert len(client._grid_cache) == 1
        assert len(client._forecast_cache) == 1
        
        client.clear_cache()
        
        assert len(client._grid_cache) == 0
        assert len(client._forecast_cache) == 0
    
    @pytest.mark.asyncio
    async def test_custom_user_agent(self):
        """Test custom User-Agent header"""
        async with NOAAClient() as client:
            assert "User-Agent" in client.session.headers
            assert client.session.headers["User-Agent"] == NOAAClient.USER_AGENT
    
    @pytest.mark.asyncio
    async def test_client_without_context_manager_raises(self):
        """Test client requires context manager"""
        client = NOAAClient()
        
        with pytest.raises(RuntimeError, match="not initialized"):
            await client._get("https://test.com")
