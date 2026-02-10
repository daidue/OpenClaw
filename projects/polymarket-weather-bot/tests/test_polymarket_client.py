"""Tests for Polymarket API client"""

import pytest
from unittest.mock import AsyncMock, patch
import asyncio
from decimal import Decimal

from src.polymarket.client import PolymarketClient


class TestPolymarketClient:
    """Test Polymarket client"""
    
    @pytest.mark.asyncio
    async def test_client_initialization(self):
        """Test client initialization"""
        async with PolymarketClient() as client:
            assert client.rate_limit == 5.0
            assert client.session is not None
    
    @pytest.mark.asyncio
    async def test_client_context_manager(self):
        """Test async context manager"""
        client = PolymarketClient()
        assert client.session is None
        
        async with client:
            assert client.session is not None
        
        assert client.session.closed
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """Test rate limiting enforcement"""
        client = PolymarketClient(rate_limit_per_second=10.0)
        
        start_time = asyncio.get_event_loop().time()
        
        await client._rate_limit_wait()
        await client._rate_limit_wait()
        await client._rate_limit_wait()
        
        end_time = asyncio.get_event_loop().time()
        elapsed = end_time - start_time
        
        assert elapsed >= 0.15
    
    @pytest.mark.asyncio
    async def test_get_markets(self, polymarket_api_response_markets):
        """Test fetching markets"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=polymarket_api_response_markets)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                markets = await client.get_markets(limit=100)
                
                assert len(markets) == 2
                assert markets[0]['condition_id'] == '0xcondition123'
    
    @pytest.mark.asyncio
    async def test_get_markets_with_data_wrapper(self):
        """Test fetching markets when response has data wrapper"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                wrapped_response = {
                    'data': [
                        {'condition_id': '0xtest', 'question': 'Test?', 'closed': False}
                    ]
                }
                
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=wrapped_response)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                markets = await client.get_markets()
                
                assert len(markets) == 1
                assert markets[0]['condition_id'] == '0xtest'
    
    @pytest.mark.asyncio
    async def test_search_markets(self, polymarket_api_response_markets):
        """Test searching markets"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=polymarket_api_response_markets)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                markets = await client.search_markets('NYC')
                
                # Should filter by query
                assert len(markets) == 1
                assert 'NYC' in markets[0]['question']
    
    @pytest.mark.asyncio
    async def test_get_market(self):
        """Test fetching single market"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                market_data = {
                    'condition_id': '0xtest123',
                    'question': 'Test market?',
                }
                
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=market_data)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                market = await client.get_market('0xtest123')
                
                assert market['condition_id'] == '0xtest123'
    
    @pytest.mark.asyncio
    async def test_get_market_prices(self, polymarket_api_response_prices):
        """Test fetching market prices"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=polymarket_api_response_prices)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                prices = await client.get_market_prices('0xcondition123')
                
                assert prices['market'] == '0xcondition123'
                assert len(prices['tokens']) == 2
    
    @pytest.mark.asyncio
    async def test_get_orderbook(self):
        """Test fetching orderbook"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                orderbook = {
                    'bids': [{'price': '0.60', 'size': '100.0'}],
                    'asks': [{'price': '0.62', 'size': '50.0'}],
                }
                
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=orderbook)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                result = await client.get_orderbook('0xtoken123')
                
                assert len(result['bids']) == 1
                assert len(result['asks']) == 1
    
    @pytest.mark.asyncio
    async def test_get_all_weather_markets(self, polymarket_api_response_markets):
        """Test fetching all weather markets"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=polymarket_api_response_markets)
                mock_get.return_value.__aenter__.return_value = mock_response
                
                markets = await client.get_all_weather_markets()
                
                assert len(markets) >= 0
    
    @pytest.mark.asyncio
    async def test_get_request_404(self):
        """Test 404 response"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_response = AsyncMock()
                mock_response.status = 404
                mock_get.return_value.__aenter__.return_value = mock_response
                
                result = await client._get("https://test.com")
                
                assert result is None
    
    @pytest.mark.asyncio
    async def test_get_request_with_retries(self):
        """Test retry logic on failures"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                responses = [
                    AsyncMock(status=500),
                    AsyncMock(status=500),
                    AsyncMock(status=200, json=AsyncMock(return_value={"success": True})),
                ]
                
                mock_get.return_value.__aenter__.side_effect = responses
                
                with patch('asyncio.sleep', new_callable=AsyncMock):
                    result = await client._get("https://test.com")
                
                assert result == {"success": True}
                assert mock_get.call_count == 3
    
    @pytest.mark.asyncio
    async def test_rate_limit_429_response(self):
        """Test handling of 429 rate limit response"""
        async with PolymarketClient() as client:
            with patch.object(client.session, 'get') as mock_get:
                responses = [
                    AsyncMock(status=429),
                    AsyncMock(status=200, json=AsyncMock(return_value={"success": True})),
                ]
                
                mock_get.return_value.__aenter__.side_effect = responses
                
                with patch('asyncio.sleep', new_callable=AsyncMock):
                    result = await client._get("https://test.com")
                
                assert result == {"success": True}
    
    @pytest.mark.asyncio
    async def test_get_request_timeout(self):
        """Test timeout handling"""
        async with PolymarketClient(request_timeout=1) as client:
            with patch.object(client.session, 'get') as mock_get:
                mock_get.return_value.__aenter__.side_effect = asyncio.TimeoutError()
                
                result = await client._get("https://test.com", retries=2)
                
                assert result is None
                assert mock_get.call_count == 2
    
    @pytest.mark.asyncio
    async def test_client_without_context_manager_raises(self):
        """Test client requires context manager"""
        client = PolymarketClient()
        
        with pytest.raises(RuntimeError, match="not initialized"):
            await client._get("https://test.com")
