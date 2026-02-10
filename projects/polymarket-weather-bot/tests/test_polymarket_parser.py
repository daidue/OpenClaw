"""Tests for Polymarket market parser"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from src.polymarket.parser import PolymarketParser
from src.models import MarketType, TemperatureUnit, PolymarketMarket


class TestPolymarketParser:
    """Test Polymarket parser"""
    
    def test_normalize_city(self):
        """Test city name normalization"""
        assert PolymarketParser.normalize_city('NYC') == 'New York'
        assert PolymarketParser.normalize_city('LA') == 'Los Angeles'
        assert PolymarketParser.normalize_city('New York City') == 'New York'
        assert PolymarketParser.normalize_city('Chicago') == 'Chicago'
    
    def test_parse_date_month_day(self):
        """Test parsing 'February 10' format"""
        result = PolymarketParser.parse_date('February 10', year=2026)
        
        assert result is not None
        assert result.month == 2
        assert result.day == 10
        assert result.year == 2026
    
    def test_parse_date_abbreviated_month(self):
        """Test parsing 'Feb 10' format"""
        result = PolymarketParser.parse_date('Feb 10', year=2026)
        
        assert result is not None
        assert result.month == 2
        assert result.day == 10
    
    def test_parse_date_with_year(self):
        """Test parsing 'Feb 10, 2026' format"""
        result = PolymarketParser.parse_date('Feb 10, 2026')
        
        assert result is not None
        assert result.year == 2026
        assert result.month == 2
        assert result.day == 10
    
    def test_parse_date_future_inference(self):
        """Test date infers future year if past"""
        # Parse a date in the past without year
        result = PolymarketParser.parse_date('January 1')
        
        assert result is not None
        # Should be in current or next year
        assert result.year >= datetime.now().year
    
    def test_parse_date_invalid(self):
        """Test invalid date string"""
        result = PolymarketParser.parse_date('not a date')
        assert result is None
    
    def test_parse_question_high_temp_threshold(self):
        """Test parsing high temperature threshold question"""
        question = "Will NYC high exceed 50°F on Feb 10?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['market_type'] == MarketType.HIGH_TEMP
        assert result['city'] == 'New York'
        assert result['temp_threshold'] == 50.0
        assert result['temp_unit'] == TemperatureUnit.FAHRENHEIT
    
    def test_parse_question_temp_range(self):
        """Test parsing temperature range question"""
        question = "NYC temperature 50-52°F on Feb 10?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['temp_range_low'] == 50.0
        assert result['temp_range_high'] == 52.0
    
    def test_parse_question_celsius(self):
        """Test parsing Celsius temperature"""
        question = "Will London high exceed 10°C on Feb 10?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['temp_threshold'] == 10.0
        assert result['temp_unit'] == TemperatureUnit.CELSIUS
    
    def test_parse_question_general_temp(self):
        """Test parsing general temperature question"""
        question = "Highest temperature in Chicago on February 15?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['market_type'] == MarketType.HIGH_TEMP
        assert result['city'] == 'Chicago'
    
    def test_parse_question_precipitation(self):
        """Test parsing precipitation question"""
        question = "Will it rain in Seattle on March 1?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['market_type'] == MarketType.PRECIPITATION
    
    def test_parse_question_snow(self):
        """Test parsing snow question"""
        question = "Will it snow in Denver on Feb 10?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['market_type'] == MarketType.SNOW
    
    def test_parse_question_low_temp(self):
        """Test parsing low temperature question"""
        question = "Will Chicago low drop below 20°F on Feb 10?"
        result = PolymarketParser._parse_question(question)
        
        assert result is not None
        assert result['market_type'] == MarketType.LOW_TEMP
    
    def test_extract_city_from_text(self):
        """Test extracting city from text"""
        assert PolymarketParser._extract_city("What will happen in New York?") == "New York"
        assert PolymarketParser._extract_city("Chicago weather tomorrow") == "Chicago"
        assert PolymarketParser._extract_city("NYC temp") == "New York"
    
    def test_extract_city_not_found(self):
        """Test city extraction when no city found"""
        result = PolymarketParser._extract_city("Random question with no city")
        assert result is None
    
    def test_extract_date_from_text(self):
        """Test extracting date from text"""
        result = PolymarketParser._extract_date("Something on February 10")
        
        assert result is not None
        assert result.month == 2
        assert result.day == 10
    
    def test_extract_date_with_year(self):
        """Test extracting date with year from text"""
        result = PolymarketParser._extract_date("Event on Feb 10, 2026")
        
        assert result is not None
        assert result.year == 2026
    
    def test_extract_prices_from_tokens(self):
        """Test extracting prices from tokens array"""
        market_data = {}
        tokens = [
            {'outcome': 'Yes', 'price': '0.65'},
            {'outcome': 'No', 'price': '0.35'},
        ]
        
        yes_price, no_price = PolymarketParser._extract_prices(market_data, tokens)
        
        assert yes_price == Decimal('0.65')
        assert no_price == Decimal('0.35')
    
    def test_extract_prices_from_direct_fields(self):
        """Test extracting prices from direct fields"""
        market_data = {
            'yes_price': '0.70',
            'no_price': '0.30',
        }
        tokens = []
        
        yes_price, no_price = PolymarketParser._extract_prices(market_data, tokens)
        
        assert yes_price == Decimal('0.70')
        assert no_price == Decimal('0.30')
    
    def test_extract_prices_normalize(self):
        """Test price normalization when sum != 1.0"""
        market_data = {}
        tokens = [
            {'outcome': 'Yes', 'price': '0.70'},
            {'outcome': 'No', 'price': '0.40'},  # Sum = 1.10
        ]
        
        yes_price, no_price = PolymarketParser._extract_prices(market_data, tokens)
        
        # Should normalize to sum to 1.0
        assert abs((yes_price + no_price) - Decimal('1.0')) < Decimal('0.01')
    
    def test_parse_weather_market_complete(self, tomorrow):
        """Test parsing complete weather market"""
        market_data = {
            'id': 'market_123',
            'condition_id': '0xcondition123',
            'question': 'Will NYC high exceed 50°F on Feb 11?',
            'description': 'Resolves YES if official high temp > 50°F',
            'tokens': [
                {'outcome': 'Yes', 'price': '0.60'},
                {'outcome': 'No', 'price': '0.40'},
            ],
            'liquidity': '5000',
            'volume': '12000',
            'active': True,
            'closed': False,
            'created_at': '2026-02-08T12:00:00Z',
        }
        
        result = PolymarketParser.parse_weather_market(market_data)
        
        assert result is not None
        assert isinstance(result, PolymarketMarket)
        assert result.city == 'New York'
        assert result.market_type == MarketType.HIGH_TEMP
        assert result.temp_threshold == 50.0
        assert result.yes_price == Decimal('0.60')
    
    def test_parse_weather_market_no_question(self):
        """Test parsing market with no question"""
        market_data = {
            'id': 'test',
            'condition_id': 'test',
        }
        
        result = PolymarketParser.parse_weather_market(market_data)
        assert result is None
    
    def test_parse_weather_market_unparseable_question(self):
        """Test parsing market with unparseable question"""
        market_data = {
            'id': 'test',
            'condition_id': 'test',
            'question': 'Some random non-weather question',
            'tokens': [],
            'liquidity': '1000',
            'volume': '500',
        }
        
        result = PolymarketParser.parse_weather_market(market_data)
        assert result is None
    
    def test_parse_weather_market_missing_ids(self):
        """Test parsing market with missing IDs"""
        market_data = {
            'question': 'Will NYC high exceed 50°F on Feb 11?',
        }
        
        result = PolymarketParser.parse_weather_market(market_data)
        assert result is None
    
    def test_filter_tradeable_markets_by_liquidity(self, polymarket_market_nyc_high_temp):
        """Test filtering markets by liquidity"""
        low_liquidity_market = polymarket_market_nyc_high_temp.copy()
        low_liquidity_market.liquidity = Decimal('500')
        
        markets = [polymarket_market_nyc_high_temp, low_liquidity_market]
        
        result = PolymarketParser.filter_tradeable_markets(
            markets,
            min_liquidity=Decimal('1000')
        )
        
        # Should only keep market with liquidity >= 1000
        assert len(result) == 1
        assert result[0].liquidity >= Decimal('1000')
    
    def test_filter_tradeable_markets_by_date(self, polymarket_market_nyc_high_temp, tomorrow):
        """Test filtering markets by date"""
        # Create market too far in future
        far_future_market = polymarket_market_nyc_high_temp.copy()
        far_future_market.date = tomorrow + timedelta(days=10)
        
        # Create market in past
        past_market = polymarket_market_nyc_high_temp.copy()
        past_market.date = datetime.now() - timedelta(days=2)
        
        markets = [polymarket_market_nyc_high_temp, far_future_market, past_market]
        
        result = PolymarketParser.filter_tradeable_markets(
            markets,
            max_days_ahead=7
        )
        
        # Should only keep market within 7 days and not in past
        assert len(result) == 1
        assert result[0].market_id == polymarket_market_nyc_high_temp.market_id
    
    def test_filter_tradeable_markets_inactive(self, polymarket_market_nyc_high_temp):
        """Test filtering out inactive markets"""
        inactive_market = polymarket_market_nyc_high_temp.copy()
        inactive_market.is_active = False
        
        markets = [polymarket_market_nyc_high_temp, inactive_market]
        
        result = PolymarketParser.filter_tradeable_markets(markets)
        
        # Should only keep active market
        assert len(result) == 1
        assert result[0].is_active
    
    def test_filter_tradeable_markets_all_filters(self, polymarket_market_nyc_high_temp):
        """Test multiple filters together"""
        # Good market
        good = polymarket_market_nyc_high_temp.copy()
        
        # Fails liquidity
        low_liq = polymarket_market_nyc_high_temp.copy()
        low_liq.liquidity = Decimal('100')
        
        # Fails active check
        inactive = polymarket_market_nyc_high_temp.copy()
        inactive.is_active = False
        
        # Fails date check
        past = polymarket_market_nyc_high_temp.copy()
        past.date = datetime.now() - timedelta(days=1)
        
        markets = [good, low_liq, inactive, past]
        
        result = PolymarketParser.filter_tradeable_markets(
            markets,
            min_liquidity=Decimal('1000'),
            max_days_ahead=7
        )
        
        assert len(result) == 1
        assert result[0].market_id == good.market_id
