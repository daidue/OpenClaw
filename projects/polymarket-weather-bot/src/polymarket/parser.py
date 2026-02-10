"""Parse Polymarket markets into structured weather market data"""

import re
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from ..models import PolymarketMarket, MarketType, TemperatureUnit

logger = logging.getLogger(__name__)


class PolymarketParser:
    """Parse Polymarket market data"""
    
    # Regex patterns for parsing weather questions
    TEMP_PATTERNS = [
        # "Highest temperature in NYC on February 10?"
        r'(?:highest|high|maximum|max)\s+temp(?:erature)?\s+in\s+([A-Za-z\s]+)\s+on\s+([A-Za-z]+\s+\d+)',
        # "Will NYC high exceed 50°F on Feb 10?"
        r'will\s+([A-Za-z\s]+)\s+(?:high|maximum)\s+(?:exceed|be above)\s+(\d+)\s*[°]?([CF])\s+on\s+([A-Za-z]+\s+\d+)',
        # "NYC temperature 50-52°F on Feb 10?"
        r'([A-Za-z\s]+)\s+temp(?:erature)?\s+(\d+)-(\d+)\s*[°]?([CF])\s+on\s+([A-Za-z]+\s+\d+)',
    ]
    
    CITY_ALIASES = {
        'nyc': 'New York',
        'new york city': 'New York',
        'la': 'Los Angeles',
        'sf': 'San Francisco',
        'dc': 'Washington DC',
        'philly': 'Philadelphia',
    }
    
    @staticmethod
    def normalize_city(city: str) -> str:
        """Normalize city name"""
        city_lower = city.strip().lower()
        return PolymarketParser.CITY_ALIASES.get(city_lower, city.strip().title())
    
    @staticmethod
    def parse_date(date_str: str, year: int = None) -> Optional[datetime]:
        """
        Parse date string like 'February 10' or 'Feb 10'.
        
        Args:
            date_str: Date string
            year: Year (defaults to current or next year if past)
        """
        try:
            # Try parsing with various formats
            for fmt in ['%B %d', '%b %d', '%B %d, %Y', '%b %d, %Y']:
                try:
                    parsed = datetime.strptime(date_str.strip(), fmt)
                    
                    # If year not in string, infer it
                    if parsed.year == 1900:
                        if year:
                            parsed = parsed.replace(year=year)
                        else:
                            current_year = datetime.now().year
                            parsed = parsed.replace(year=current_year)
                            
                            # If date is in the past, assume next year
                            if parsed < datetime.now():
                                parsed = parsed.replace(year=current_year + 1)
                    
                    return parsed
                except ValueError:
                    continue
            
            logger.warning(f"Could not parse date: {date_str}")
            return None
        
        except Exception as e:
            logger.error(f"Date parsing error: {e}")
            return None
    
    @staticmethod
    def parse_weather_market(market_data: Dict) -> Optional[PolymarketMarket]:
        """
        Parse Polymarket market data into PolymarketMarket.
        
        Args:
            market_data: Raw market data from API
        
        Returns:
            PolymarketMarket or None if not parseable
        """
        try:
            question = market_data.get('question', '')
            description = market_data.get('description', '')
            
            if not question:
                logger.warning("Market has no question")
                return None
            
            # Extract market metadata
            market_id = market_data.get('id') or market_data.get('condition_id')
            condition_id = market_data.get('condition_id') or market_data.get('id')
            
            if not market_id or not condition_id:
                logger.warning(f"Missing IDs in market: {question}")
                return None
            
            # Parse question to extract weather details
            parsed = PolymarketParser._parse_question(question, description)
            
            if not parsed:
                logger.debug(f"Could not parse question: {question}")
                return None
            
            # Extract prices
            tokens = market_data.get('tokens', [])
            yes_price, no_price = PolymarketParser._extract_prices(market_data, tokens)
            
            # Extract liquidity and volume
            liquidity = Decimal(str(market_data.get('liquidity', 0)))
            volume = Decimal(str(market_data.get('volume', 0)))
            
            # Timestamps
            created_at = datetime.fromisoformat(
                market_data.get('created_at', datetime.now().isoformat())
            )
            
            # Some markets have 'end_date_iso'
            closes_at = None
            if 'end_date_iso' in market_data:
                try:
                    closes_at = datetime.fromisoformat(market_data['end_date_iso'])
                except:
                    pass
            
            is_active = market_data.get('active', True) and not market_data.get('closed', False)
            
            return PolymarketMarket(
                market_id=market_id,
                condition_id=condition_id,
                question=question,
                description=description,
                market_type=parsed['market_type'],
                city=parsed['city'],
                date=parsed['date'],
                temp_threshold=parsed.get('temp_threshold'),
                temp_range_low=parsed.get('temp_range_low'),
                temp_range_high=parsed.get('temp_range_high'),
                temp_unit=parsed.get('temp_unit', TemperatureUnit.FAHRENHEIT),
                yes_price=yes_price,
                no_price=no_price,
                liquidity=liquidity,
                volume=volume,
                created_at=created_at,
                closes_at=closes_at,
                is_active=is_active,
            )
        
        except Exception as e:
            logger.error(f"Failed to parse market: {e}", exc_info=True)
            return None
    
    @staticmethod
    def _parse_question(question: str, description: str = '') -> Optional[Dict]:
        """
        Parse question text to extract structured data.
        
        Returns:
            {
                'market_type': MarketType,
                'city': str,
                'date': datetime,
                'temp_threshold': Optional[float],
                'temp_range_low': Optional[float],
                'temp_range_high': Optional[float],
                'temp_unit': TemperatureUnit,
            }
        """
        question_lower = question.lower()
        
        # Determine market type
        if 'temperature' in question_lower or 'temp' in question_lower:
            if 'high' in question_lower or 'maximum' in question_lower:
                market_type = MarketType.HIGH_TEMP
            elif 'low' in question_lower or 'minimum' in question_lower:
                market_type = MarketType.LOW_TEMP
            else:
                market_type = MarketType.HIGH_TEMP  # Default
        elif 'rain' in question_lower or 'precipitation' in question_lower:
            market_type = MarketType.PRECIPITATION
        elif 'snow' in question_lower:
            market_type = MarketType.SNOW
        else:
            market_type = MarketType.UNKNOWN
        
        # Try parsing with regex patterns
        for pattern in PolymarketParser.TEMP_PATTERNS:
            match = re.search(pattern, question, re.IGNORECASE)
            if match:
                groups = match.groups()
                
                # Pattern 1: "Highest temperature in NYC on February 10?"
                if len(groups) == 2:
                    city = PolymarketParser.normalize_city(groups[0])
                    date = PolymarketParser.parse_date(groups[1])
                    
                    if date:
                        return {
                            'market_type': market_type,
                            'city': city,
                            'date': date,
                            'temp_unit': TemperatureUnit.FAHRENHEIT,
                        }
                
                # Pattern 2: "Will NYC high exceed 50°F on Feb 10?"
                elif len(groups) == 4:
                    city = PolymarketParser.normalize_city(groups[0])
                    threshold = float(groups[1])
                    unit = TemperatureUnit.FAHRENHEIT if groups[2].upper() == 'F' else TemperatureUnit.CELSIUS
                    date = PolymarketParser.parse_date(groups[3])
                    
                    if date:
                        return {
                            'market_type': market_type,
                            'city': city,
                            'date': date,
                            'temp_threshold': threshold,
                            'temp_unit': unit,
                        }
                
                # Pattern 3: "NYC temperature 50-52°F on Feb 10?"
                elif len(groups) == 5:
                    city = PolymarketParser.normalize_city(groups[0])
                    range_low = float(groups[1])
                    range_high = float(groups[2])
                    unit = TemperatureUnit.FAHRENHEIT if groups[3].upper() == 'F' else TemperatureUnit.CELSIUS
                    date = PolymarketParser.parse_date(groups[4])
                    
                    if date:
                        return {
                            'market_type': market_type,
                            'city': city,
                            'date': date,
                            'temp_range_low': range_low,
                            'temp_range_high': range_high,
                            'temp_unit': unit,
                        }
        
        # Fallback: extract city and date manually
        city = PolymarketParser._extract_city(question)
        date = PolymarketParser._extract_date(question)
        
        if city and date:
            return {
                'market_type': market_type,
                'city': city,
                'date': date,
                'temp_unit': TemperatureUnit.FAHRENHEIT,
            }
        
        return None
    
    @staticmethod
    def _extract_city(text: str) -> Optional[str]:
        """Extract city name from text"""
        # Look for common city names
        from ..noaa.cities import TOP_US_CITIES
        
        text_lower = text.lower()
        for city in TOP_US_CITIES:
            if city.name.lower() in text_lower:
                return city.name
        
        # Check aliases
        for alias, full_name in PolymarketParser.CITY_ALIASES.items():
            if alias in text_lower:
                return full_name
        
        return None
    
    @staticmethod
    def _extract_date(text: str) -> Optional[datetime]:
        """Extract date from text"""
        # Look for patterns like "February 10", "Feb 10, 2026"
        date_pattern = r'([A-Za-z]+)\s+(\d+)(?:,?\s+(\d{4}))?'
        match = re.search(date_pattern, text)
        
        if match:
            month_str = match.group(1)
            day = match.group(2)
            year = match.group(3)
            
            date_str = f"{month_str} {day}"
            if year:
                date_str += f", {year}"
            
            return PolymarketParser.parse_date(date_str)
        
        return None
    
    @staticmethod
    def _extract_prices(market_data: Dict, tokens: List[Dict]) -> tuple[Decimal, Decimal]:
        """Extract YES and NO prices from market data"""
        yes_price = Decimal("0.5")
        no_price = Decimal("0.5")
        
        # Try tokens array first
        if tokens:
            for token in tokens:
                outcome = token.get('outcome', '').lower()
                price_str = token.get('price', '0.5')
                
                try:
                    price = Decimal(str(price_str))
                    if outcome == 'yes':
                        yes_price = price
                    elif outcome == 'no':
                        no_price = price
                except:
                    pass
        
        # Fallback: check direct fields
        if 'yes_price' in market_data:
            yes_price = Decimal(str(market_data['yes_price']))
        if 'no_price' in market_data:
            no_price = Decimal(str(market_data['no_price']))
        
        # Ensure prices sum to ~1.0 (allow small spread)
        if not 0.95 <= (yes_price + no_price) <= 1.05:
            logger.warning(f"Prices don't sum to 1.0: yes={yes_price}, no={no_price}")
            # Normalize
            total = yes_price + no_price
            if total > 0:
                yes_price = yes_price / total
                no_price = no_price / total
        
        return yes_price, no_price
    
    @staticmethod
    def filter_tradeable_markets(
        markets: List[PolymarketMarket],
        min_liquidity: Decimal = Decimal("1000"),
        max_days_ahead: int = 7
    ) -> List[PolymarketMarket]:
        """
        Filter markets to only tradeable ones.
        
        Args:
            markets: List of parsed markets
            min_liquidity: Minimum liquidity required
            max_days_ahead: Max days in future to trade
        
        Returns:
            Filtered list of tradeable markets
        """
        now = datetime.now()
        max_date = now + timedelta(days=max_days_ahead)
        
        tradeable = []
        for market in markets:
            # Active markets only
            if not market.is_active:
                continue
            
            # Sufficient liquidity
            if market.liquidity < min_liquidity:
                logger.debug(f"Skipping {market.question}: low liquidity ({market.liquidity})")
                continue
            
            # Date in valid range (not too far in future)
            if market.date > max_date:
                logger.debug(f"Skipping {market.question}: too far ahead ({market.date})")
                continue
            
            # Date not in past
            if market.date.date() < now.date():
                logger.debug(f"Skipping {market.question}: in the past ({market.date})")
                continue
            
            tradeable.append(market)
        
        logger.info(f"Filtered {len(markets)} → {len(tradeable)} tradeable markets")
        return tradeable


from datetime import timedelta
