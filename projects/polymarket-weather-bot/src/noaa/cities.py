"""Top 20 US cities for weather trading"""

from typing import NamedTuple, List


class City(NamedTuple):
    """City coordinates"""
    name: str
    latitude: float
    longitude: float
    population: int  # For prioritization


# Top 20 US cities by population (2024 data)
TOP_US_CITIES: List[City] = [
    City("New York", 40.7128, -74.0060, 8336817),
    City("Los Angeles", 34.0522, -118.2437, 3979576),
    City("Chicago", 41.8781, -87.6298, 2693976),
    City("Houston", 29.7604, -95.3698, 2320268),
    City("Phoenix", 33.4484, -112.0740, 1680992),
    City("Philadelphia", 39.9526, -75.1652, 1584064),
    City("San Antonio", 29.4241, -98.4936, 1547253),
    City("San Diego", 32.7157, -117.1611, 1423851),
    City("Dallas", 32.7767, -96.7970, 1343573),
    City("San Jose", 37.3382, -121.8863, 1013240),
    City("Austin", 30.2672, -97.7431, 978908),
    City("Jacksonville", 30.3322, -81.6557, 949611),
    City("Fort Worth", 32.7555, -97.3308, 918915),
    City("Columbus", 39.9612, -82.9988, 905748),
    City("Charlotte", 35.2271, -80.8431, 897720),
    City("San Francisco", 37.7749, -122.4194, 873965),
    City("Indianapolis", 39.7684, -86.1581, 887642),
    City("Seattle", 47.6062, -122.3321, 753675),
    City("Denver", 39.7392, -104.9903, 727211),
    City("Washington DC", 38.9072, -77.0369, 705749),
]


def get_city(name: str) -> City | None:
    """Get city by name (case-insensitive)"""
    name_lower = name.lower()
    for city in TOP_US_CITIES:
        if city.name.lower() == name_lower:
            return city
    return None


def get_all_cities() -> List[City]:
    """Get all tracked cities"""
    return TOP_US_CITIES.copy()
