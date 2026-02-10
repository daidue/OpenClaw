"""Parse NOAA API responses into structured forecast data"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from ..models import NOAAForecast, TemperatureUnit

logger = logging.getLogger(__name__)


class NOAAParser:
    """Parse NOAA weather data into trading-relevant formats"""
    
    @staticmethod
    def parse_iso_datetime(dt_str: str) -> Optional[datetime]:
        """Parse ISO 8601 datetime string"""
        try:
            # Remove timezone info for simplicity
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except Exception as e:
            logger.error(f"Failed to parse datetime '{dt_str}': {e}")
            return None
    
    @staticmethod
    def extract_forecast_for_date(
        forecast_data: Dict,
        target_date: datetime,
        city: str
    ) -> Optional[NOAAForecast]:
        """
        Extract temperature forecast for a specific date from NOAA hourly data.
        
        Args:
            forecast_data: NOAA hourly forecast response
            target_date: Date to extract forecast for (only date matters, not time)
            city: City name
        
        Returns:
            NOAAForecast with high/low temperature predictions
        """
        if not forecast_data or 'properties' not in forecast_data:
            logger.error("Invalid forecast data structure")
            return None
        
        # Extract grid info if available
        grid_info = forecast_data.get('_grid_info', {})
        
        properties = forecast_data['properties']
        periods = properties.get('periods', [])
        
        if not periods:
            logger.error("No forecast periods found")
            return None
        
        # Filter periods for target date
        target_day = target_date.date()
        temps_for_day: List[float] = []
        precip_probs: List[float] = []
        
        for period in periods:
            start_time_str = period.get('startTime')
            if not start_time_str:
                continue
            
            start_time = NOAAParser.parse_iso_datetime(start_time_str)
            if not start_time:
                continue
            
            # Check if this period is for our target date
            if start_time.date() == target_day:
                # Collect temperature
                temp = period.get('temperature')
                if temp is not None:
                    # Convert to Fahrenheit if needed
                    temp_unit = period.get('temperatureUnit', 'F')
                    if temp_unit == 'C':
                        temp = (temp * 9/5) + 32
                    temps_for_day.append(float(temp))
                
                # Collect precipitation probability
                precip_data = period.get('probabilityOfPrecipitation', {})
                precip_value = precip_data.get('value')
                if precip_value is not None:
                    precip_probs.append(float(precip_value) / 100.0)  # Convert to 0-1
        
        if not temps_for_day:
            logger.warning(f"No temperature data found for {target_day}")
            return None
        
        # Calculate high/low temps
        high_temp = max(temps_for_day)
        low_temp = min(temps_for_day)
        
        # Average precipitation probability
        avg_precip = sum(precip_probs) / len(precip_probs) if precip_probs else None
        
        # Calculate forecast horizon
        generated_time = NOAAParser.parse_iso_datetime(
            properties.get('generatedAt') or 
            properties.get('updateTime') or 
            periods[0].get('startTime')
        )
        
        if not generated_time:
            generated_time = datetime.now()
        
        forecast_horizon_hours = int((target_date - generated_time).total_seconds() / 3600)
        
        # Estimate confidence based on forecast horizon
        # Closer forecasts are more reliable
        confidence = NOAAParser._calculate_confidence(forecast_horizon_hours)
        
        return NOAAForecast(
            city=city,
            latitude=grid_info.get('latitude', 0.0),
            longitude=grid_info.get('longitude', 0.0),
            grid_office=grid_info.get('gridId', ''),
            grid_x=grid_info.get('gridX', 0),
            grid_y=grid_info.get('gridY', 0),
            forecast_date=target_date,
            forecast_generated_at=generated_time,
            high_temp=high_temp,
            low_temp=low_temp,
            high_temp_confidence=confidence,
            low_temp_confidence=confidence,
            precipitation_probability=avg_precip,
            forecast_horizon_hours=forecast_horizon_hours,
            raw_data={
                'num_periods': len(temps_for_day),
                'temp_range': f"{low_temp:.1f}F - {high_temp:.1f}F",
            }
        )
    
    @staticmethod
    def _calculate_confidence(forecast_horizon_hours: int) -> float:
        """
        Calculate confidence score based on forecast horizon.
        
        Based on NOAA accuracy stats:
        - 24h: Very high (0.95)
        - 48h: High (0.85)
        - 72h: Good (0.75)
        - 120h (5 days): Moderate (0.60)
        - 168h+ (7 days): Low (0.50)
        """
        if forecast_horizon_hours < 0:
            return 1.0  # Historical (actual data)
        elif forecast_horizon_hours <= 24:
            return 0.95
        elif forecast_horizon_hours <= 48:
            return 0.85
        elif forecast_horizon_hours <= 72:
            return 0.75
        elif forecast_horizon_hours <= 120:
            return 0.60
        else:
            return max(0.50, 0.60 - ((forecast_horizon_hours - 120) / 480))  # Decay further
    
    @staticmethod
    def estimate_temperature_distribution(
        forecast: NOAAForecast,
        bucket_width: float = 2.0
    ) -> Dict[str, float]:
        """
        Estimate probability distribution across temperature buckets.
        
        For a NOAA forecast of high_temp=52°F with confidence=0.85,
        returns probabilities for buckets like "50-52", "52-54", etc.
        
        Args:
            forecast: NOAA forecast with high_temp prediction
            bucket_width: Width of temperature buckets (e.g., 2°F)
        
        Returns:
            Dict mapping bucket name to probability
            Example: {"50-52": 0.25, "52-54": 0.50, "54-56": 0.25}
        """
        if forecast.high_temp is None:
            return {}
        
        predicted_temp = forecast.high_temp
        confidence = forecast.high_temp_confidence or 0.7
        
        # Standard deviation based on confidence
        # Higher confidence = tighter distribution
        # At 48h (conf=0.85), NOAA typically within 3°F, so σ ≈ 1.5°F
        std_dev = 3.0 * (1.0 - confidence) + 1.0
        
        # Generate buckets around prediction (±10°F range)
        buckets = {}
        temp_range = range(
            int(predicted_temp - 10),
            int(predicted_temp + 10),
            int(bucket_width)
        )
        
        for bucket_start in temp_range:
            bucket_end = bucket_start + bucket_width
            bucket_name = f"{bucket_start:.0f}-{bucket_end:.0f}"
            
            # Calculate probability using normal distribution
            # P(bucket) ≈ area under normal curve for that range
            prob = NOAAParser._normal_cdf(bucket_end, predicted_temp, std_dev) - \
                   NOAAParser._normal_cdf(bucket_start, predicted_temp, std_dev)
            
            if prob > 0.01:  # Only include buckets with >1% probability
                buckets[bucket_name] = prob
        
        # Normalize to sum to 1.0
        total = sum(buckets.values())
        if total > 0:
            buckets = {k: v/total for k, v in buckets.items()}
        
        return buckets
    
    @staticmethod
    def _normal_cdf(x: float, mean: float, std_dev: float) -> float:
        """Cumulative distribution function for normal distribution"""
        import math
        
        # Using error function approximation
        z = (x - mean) / (std_dev * math.sqrt(2))
        return 0.5 * (1 + math.erf(z))
    
    @staticmethod
    def parse_multiple_forecasts(
        forecast_data_list: List[Dict],
        target_date: datetime,
        cities: List[str]
    ) -> List[NOAAForecast]:
        """
        Parse forecasts for multiple cities.
        
        Args:
            forecast_data_list: List of NOAA forecast responses
            target_date: Target forecast date
            cities: List of city names (same order as forecast_data_list)
        
        Returns:
            List of NOAAForecast objects
        """
        forecasts = []
        
        for forecast_data, city in zip(forecast_data_list, cities):
            forecast = NOAAParser.extract_forecast_for_date(
                forecast_data,
                target_date,
                city
            )
            if forecast:
                forecasts.append(forecast)
            else:
                logger.warning(f"Failed to parse forecast for {city}")
        
        return forecasts
