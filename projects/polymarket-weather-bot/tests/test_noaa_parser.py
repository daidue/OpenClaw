"""Tests for NOAA forecast parser"""

import pytest
from datetime import datetime, timedelta

from src.noaa.parser import NOAAParser
from src.models import NOAAForecast


class TestNOAAParser:
    """Test NOAA parser"""
    
    def test_parse_iso_datetime(self):
        """Test ISO datetime parsing"""
        dt_str = "2026-02-11T14:00:00-05:00"
        result = NOAAParser.parse_iso_datetime(dt_str)
        
        assert result is not None
        assert result.year == 2026
        assert result.month == 2
        assert result.day == 11
    
    def test_parse_iso_datetime_with_z(self):
        """Test ISO datetime with Z timezone"""
        dt_str = "2026-02-11T19:00:00Z"
        result = NOAAParser.parse_iso_datetime(dt_str)
        
        assert result is not None
        assert result.year == 2026
    
    def test_parse_iso_datetime_invalid(self):
        """Test invalid datetime string"""
        result = NOAAParser.parse_iso_datetime("not-a-date")
        assert result is None
    
    def test_extract_forecast_for_date(self, noaa_api_response_forecast, tomorrow):
        """Test extracting forecast for specific date"""
        # Modify response to match tomorrow's date
        forecast_data = noaa_api_response_forecast.copy()
        for period in forecast_data['properties']['periods']:
            period['startTime'] = tomorrow.isoformat()
        
        # Add grid info
        forecast_data['_grid_info'] = {
            'gridId': 'OKX',
            'gridX': 33,
            'gridY': 35,
            'latitude': 40.7128,
            'longitude': -74.0060,
        }
        
        result = NOAAParser.extract_forecast_for_date(
            forecast_data,
            tomorrow,
            "New York"
        )
        
        assert result is not None
        assert isinstance(result, NOAAForecast)
        assert result.city == "New York"
        assert result.grid_office == "OKX"
    
    def test_extract_forecast_high_low_temps(self, tomorrow):
        """Test high/low temperature extraction"""
        forecast_data = {
            'properties': {
                'periods': [
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 45,
                        'temperatureUnit': 'F',
                    },
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 55,
                        'temperatureUnit': 'F',
                    },
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 50,
                        'temperatureUnit': 'F',
                    },
                ],
                'generatedAt': datetime.now().isoformat(),
            },
            '_grid_info': {
                'gridId': 'TEST',
                'gridX': 1,
                'gridY': 1,
                'latitude': 40.0,
                'longitude': -74.0,
            }
        }
        
        result = NOAAParser.extract_forecast_for_date(
            forecast_data,
            tomorrow,
            "Test City"
        )
        
        assert result.high_temp == 55.0
        assert result.low_temp == 45.0
    
    def test_extract_forecast_celsius_to_fahrenheit(self, tomorrow):
        """Test Celsius to Fahrenheit conversion"""
        forecast_data = {
            'properties': {
                'periods': [
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 10,  # 10°C = 50°F
                        'temperatureUnit': 'C',
                    },
                ],
                'generatedAt': datetime.now().isoformat(),
            },
            '_grid_info': {
                'gridId': 'TEST',
                'gridX': 1,
                'gridY': 1,
                'latitude': 40.0,
                'longitude': -74.0,
            }
        }
        
        result = NOAAParser.extract_forecast_for_date(
            forecast_data,
            tomorrow,
            "Test City"
        )
        
        assert result.high_temp == 50.0
    
    def test_extract_forecast_precipitation(self, tomorrow):
        """Test precipitation probability extraction"""
        forecast_data = {
            'properties': {
                'periods': [
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 50,
                        'temperatureUnit': 'F',
                        'probabilityOfPrecipitation': {'value': 20},
                    },
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 52,
                        'temperatureUnit': 'F',
                        'probabilityOfPrecipitation': {'value': 40},
                    },
                ],
                'generatedAt': datetime.now().isoformat(),
            },
            '_grid_info': {
                'gridId': 'TEST',
                'gridX': 1,
                'gridY': 1,
                'latitude': 40.0,
                'longitude': -74.0,
            }
        }
        
        result = NOAAParser.extract_forecast_for_date(
            forecast_data,
            tomorrow,
            "Test City"
        )
        
        # Should average 20% and 40% = 30%
        assert result.precipitation_probability == pytest.approx(0.30, abs=1e-9)
    
    def test_extract_forecast_no_data_for_date(self, tomorrow):
        """Test handling when no data exists for target date"""
        yesterday = tomorrow - timedelta(days=2)
        
        forecast_data = {
            'properties': {
                'periods': [
                    {
                        'startTime': yesterday.isoformat(),
                        'temperature': 50,
                        'temperatureUnit': 'F',
                    },
                ],
            },
        }
        
        result = NOAAParser.extract_forecast_for_date(
            forecast_data,
            tomorrow,
            "Test City"
        )
        
        assert result is None
    
    def test_extract_forecast_invalid_structure(self, tomorrow):
        """Test handling invalid forecast data structure"""
        result = NOAAParser.extract_forecast_for_date(
            {},
            tomorrow,
            "Test City"
        )
        assert result is None
        
        result = NOAAParser.extract_forecast_for_date(
            {'properties': {}},
            tomorrow,
            "Test City"
        )
        assert result is None
    
    def test_calculate_confidence_24h(self):
        """Test confidence calculation for 24h forecast"""
        confidence = NOAAParser._calculate_confidence(24)
        assert confidence == 0.95
    
    def test_calculate_confidence_48h(self):
        """Test confidence calculation for 48h forecast"""
        confidence = NOAAParser._calculate_confidence(48)
        assert confidence == 0.85
    
    def test_calculate_confidence_72h(self):
        """Test confidence calculation for 72h forecast"""
        confidence = NOAAParser._calculate_confidence(72)
        assert confidence == 0.75
    
    def test_calculate_confidence_5day(self):
        """Test confidence calculation for 5-day forecast"""
        confidence = NOAAParser._calculate_confidence(120)
        assert confidence == 0.60
    
    def test_calculate_confidence_7day_plus(self):
        """Test confidence calculation for 7+ day forecast"""
        confidence = NOAAParser._calculate_confidence(168)
        assert confidence >= 0.50
        assert confidence <= 0.60
    
    def test_calculate_confidence_historical(self):
        """Test confidence for historical data (negative horizon)"""
        confidence = NOAAParser._calculate_confidence(-24)
        assert confidence == 1.0
    
    def test_estimate_temperature_distribution(self, noaa_forecast_nyc):
        """Test temperature distribution estimation"""
        buckets = NOAAParser.estimate_temperature_distribution(
            noaa_forecast_nyc,
            bucket_width=2.0
        )
        
        assert len(buckets) > 0
        
        # Should sum to ~1.0 (allowing small floating point error)
        total_prob = sum(buckets.values())
        assert 0.99 <= total_prob <= 1.01
        
        # Highest probability should be near predicted temp (55°F)
        max_bucket = max(buckets.items(), key=lambda x: x[1])
        assert "53-55" in max_bucket[0] or "55-57" in max_bucket[0]
    
    def test_estimate_temperature_distribution_high_confidence(self):
        """Test distribution with high confidence (tight)"""
        forecast = NOAAForecast(
            city="Test",
            latitude=40.0,
            longitude=-74.0,
            grid_office="TEST",
            grid_x=1,
            grid_y=1,
            forecast_date=datetime.now(),
            forecast_generated_at=datetime.now(),
            high_temp=50.0,
            high_temp_confidence=0.95,  # Very high confidence
            forecast_horizon_hours=24,
        )
        
        buckets = NOAAParser.estimate_temperature_distribution(forecast, bucket_width=2.0)
        
        # With high confidence, most probability should be in central buckets
        central_buckets = [k for k in buckets.keys() if "48-50" in k or "50-52" in k or "52-54" in k]
        central_prob = sum(buckets[k] for k in central_buckets if k in buckets)
        
        assert central_prob > 0.70  # >70% in ±2°F range
    
    def test_estimate_temperature_distribution_low_confidence(self):
        """Test distribution with low confidence (wide)"""
        forecast = NOAAForecast(
            city="Test",
            latitude=40.0,
            longitude=-74.0,
            grid_office="TEST",
            grid_x=1,
            grid_y=1,
            forecast_date=datetime.now(),
            forecast_generated_at=datetime.now(),
            high_temp=50.0,
            high_temp_confidence=0.50,  # Low confidence
            forecast_horizon_hours=168,
        )
        
        buckets = NOAAParser.estimate_temperature_distribution(forecast, bucket_width=2.0)
        
        # With low confidence, distribution should be wider
        assert len(buckets) >= 5  # Multiple buckets with significant probability
    
    def test_estimate_temperature_distribution_no_temp(self):
        """Test distribution when no temperature available"""
        forecast = NOAAForecast(
            city="Test",
            latitude=40.0,
            longitude=-74.0,
            grid_office="TEST",
            grid_x=1,
            grid_y=1,
            forecast_date=datetime.now(),
            forecast_generated_at=datetime.now(),
            high_temp=None,  # No temp data
            forecast_horizon_hours=24,
        )
        
        buckets = NOAAParser.estimate_temperature_distribution(forecast)
        assert len(buckets) == 0
    
    def test_normal_cdf(self):
        """Test normal CDF calculation"""
        # Test standard cases
        cdf_at_mean = NOAAParser._normal_cdf(50.0, 50.0, 1.0)
        assert 0.49 <= cdf_at_mean <= 0.51  # Should be ~0.5
        
        cdf_one_std = NOAAParser._normal_cdf(51.0, 50.0, 1.0)
        assert 0.83 <= cdf_one_std <= 0.85  # Should be ~0.84
        
        cdf_two_std = NOAAParser._normal_cdf(52.0, 50.0, 1.0)
        assert 0.97 <= cdf_two_std <= 0.98  # Should be ~0.977
    
    def test_parse_multiple_forecasts(self, noaa_api_response_forecast, tomorrow):
        """Test parsing multiple forecasts"""
        # Create forecast data for two cities
        forecast_data_1 = noaa_api_response_forecast.copy()
        forecast_data_2 = noaa_api_response_forecast.copy()
        
        # Fix dates
        for period in forecast_data_1['properties']['periods']:
            period['startTime'] = tomorrow.isoformat()
        for period in forecast_data_2['properties']['periods']:
            period['startTime'] = tomorrow.isoformat()
        
        # Add grid info
        forecast_data_1['_grid_info'] = {
            'gridId': 'OKX',
            'gridX': 33,
            'gridY': 35,
            'latitude': 40.7128,
            'longitude': -74.0060,
        }
        forecast_data_2['_grid_info'] = {
            'gridId': 'LOT',
            'gridX': 75,
            'gridY': 73,
            'latitude': 41.8781,
            'longitude': -87.6298,
        }
        
        results = NOAAParser.parse_multiple_forecasts(
            [forecast_data_1, forecast_data_2],
            tomorrow,
            ["New York", "Chicago"]
        )
        
        assert len(results) == 2
        assert results[0].city == "New York"
        assert results[1].city == "Chicago"
    
    def test_parse_multiple_forecasts_with_failure(self, tomorrow):
        """Test parsing multiple forecasts with one failure"""
        good_data = {
            'properties': {
                'periods': [
                    {
                        'startTime': tomorrow.isoformat(),
                        'temperature': 50,
                        'temperatureUnit': 'F',
                    },
                ],
                'generatedAt': datetime.now().isoformat(),
            },
            '_grid_info': {
                'gridId': 'TEST',
                'gridX': 1,
                'gridY': 1,
                'latitude': 40.0,
                'longitude': -74.0,
            }
        }
        
        bad_data = {}  # Invalid structure
        
        results = NOAAParser.parse_multiple_forecasts(
            [good_data, bad_data],
            tomorrow,
            ["City1", "City2"]
        )
        
        # Should only return the successful parse
        assert len(results) == 1
        assert results[0].city == "City1"
