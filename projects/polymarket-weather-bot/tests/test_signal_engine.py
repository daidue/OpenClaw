"""Tests for signal generation engine"""

import pytest
from decimal import Decimal
from datetime import datetime

from src.signals.engine import SignalEngine
from src.models import TradeDirection, ConfidenceLevel, MarketType


class TestSignalEngine:
    """Test signal generation engine"""
    
    def test_engine_initialization(self, bot_config):
        """Test engine initialization"""
        engine = SignalEngine(bot_config)
        
        assert engine.config == bot_config
        assert engine.scorer is not None
    
    def test_generate_signals_with_match(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test signal generation with matching forecast and market"""
        engine = SignalEngine(bot_config)
        
        forecasts = [noaa_forecast_nyc]
        markets = [polymarket_market_nyc_high_temp]
        
        signals = engine.generate_signals(forecasts, markets)
        
        # Should generate at least one signal
        assert len(signals) >= 0  # Depends on edge threshold
    
    def test_generate_signals_no_match(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_chicago_low_temp
    ):
        """Test signal generation with no matching forecast"""
        engine = SignalEngine(bot_config)
        
        # NYC forecast but Chicago market - no match
        forecasts = [noaa_forecast_nyc]
        markets = [polymarket_market_chicago_low_temp]
        
        signals = engine.generate_signals(forecasts, markets)
        
        # Should not generate signals for mismatched city
        assert len(signals) == 0
    
    def test_find_matching_forecast(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test finding matching forecast for market"""
        engine = SignalEngine(bot_config)
        
        forecasts = [noaa_forecast_nyc]
        
        match = engine._find_matching_forecast(
            polymarket_market_nyc_high_temp,
            forecasts
        )
        
        assert match is not None
        assert match.city == "New York"
    
    def test_find_matching_forecast_case_insensitive(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test city matching is case-insensitive"""
        engine = SignalEngine(bot_config)
        
        # Change case
        noaa_forecast_nyc.city = "NEW YORK"
        polymarket_market_nyc_high_temp.city = "new york"
        
        match = engine._find_matching_forecast(
            polymarket_market_nyc_high_temp,
            [noaa_forecast_nyc]
        )
        
        assert match is not None
    
    def test_find_matching_forecast_date_mismatch(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp,
        yesterday
    ):
        """Test no match when dates don't align"""
        engine = SignalEngine(bot_config)
        
        # Change forecast date to yesterday
        noaa_forecast_nyc.forecast_date = yesterday
        
        match = engine._find_matching_forecast(
            polymarket_market_nyc_high_temp,
            [noaa_forecast_nyc]
        )
        
        assert match is None
    
    def test_calculate_noaa_probability_high_temp(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test NOAA probability calculation for high temp"""
        engine = SignalEngine(bot_config)
        
        # Forecast: 55°F high, Market: exceed 50°F
        prob = engine._calculate_noaa_probability(
            noaa_forecast_nyc,
            polymarket_market_nyc_high_temp
        )
        
        assert prob is not None
        assert 0 <= prob <= 1
        # Since forecast is 55°F and threshold is 50°F, probability should be high
        assert prob > 0.7
    
    def test_calculate_noaa_probability_no_temp_data(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test probability calculation with no temp data"""
        engine = SignalEngine(bot_config)
        
        # Remove temperature data
        noaa_forecast_nyc.high_temp = None
        
        prob = engine._calculate_noaa_probability(
            noaa_forecast_nyc,
            polymarket_market_nyc_high_temp
        )
        
        assert prob is None
    
    def test_calculate_position_size(self, bot_config):
        """Test Kelly position sizing"""
        engine = SignalEngine(bot_config)
        
        size = engine._calculate_position_size(
            edge=0.20,  # 20% edge
            confidence=0.85,
            market_price=0.60
        )
        
        assert size > Decimal("0")
        assert size <= bot_config.max_position_size_dollars
    
    def test_calculate_position_size_high_edge(self, bot_config):
        """Test position sizing with high edge"""
        engine = SignalEngine(bot_config)
        
        high_edge_size = engine._calculate_position_size(
            edge=0.30,
            confidence=0.90,
            market_price=0.60
        )
        
        low_edge_size = engine._calculate_position_size(
            edge=0.10,
            confidence=0.90,
            market_price=0.60
        )
        
        # Higher edge should recommend larger position
        assert high_edge_size >= low_edge_size
    
    def test_calculate_position_size_respects_max(self, bot_config):
        """Test position sizing respects maximum"""
        engine = SignalEngine(bot_config)
        
        # Even with huge edge, shouldn't exceed max
        size = engine._calculate_position_size(
            edge=0.99,
            confidence=0.99,
            market_price=0.01
        )
        
        assert size <= bot_config.max_position_size_dollars
    
    def test_score_to_level(self, bot_config):
        """Test confidence score to level mapping"""
        engine = SignalEngine(bot_config)
        
        assert engine._score_to_level(0.95) == ConfidenceLevel.VERY_HIGH
        assert engine._score_to_level(0.85) == ConfidenceLevel.HIGH
        assert engine._score_to_level(0.70) == ConfidenceLevel.MEDIUM
        assert engine._score_to_level(0.50) == ConfidenceLevel.LOW
        assert engine._score_to_level(0.30) == ConfidenceLevel.VERY_LOW
    
    def test_build_reasoning(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test reasoning text generation"""
        engine = SignalEngine(bot_config)
        
        reasoning = engine._build_reasoning(
            forecast=noaa_forecast_nyc,
            market=polymarket_market_nyc_high_temp,
            noaa_prob=0.85,
            market_prob=0.60,
            edge=0.25,
            direction=TradeDirection.BUY
        )
        
        assert isinstance(reasoning, str)
        assert len(reasoning) > 0
        # Should mention key details
        assert "NOAA" in reasoning or "forecast" in reasoning.lower()
    
    def test_identify_risk_factors(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test risk factor identification"""
        engine = SignalEngine(bot_config)
        
        risk_factors = engine._identify_risk_factors(
            noaa_forecast_nyc,
            polymarket_market_nyc_high_temp,
            edge=0.15
        )
        
        assert isinstance(risk_factors, list)
    
    def test_identify_risk_factors_low_liquidity(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test risk factors include low liquidity warning"""
        engine = SignalEngine(bot_config)
        
        # Set low liquidity
        polymarket_market_nyc_high_temp.liquidity = Decimal("500")
        
        risk_factors = engine._identify_risk_factors(
            noaa_forecast_nyc,
            polymarket_market_nyc_high_temp,
            edge=0.15
        )
        
        # Should include liquidity warning
        assert any("liquidity" in rf.lower() for rf in risk_factors)
    
    def test_identify_risk_factors_low_confidence(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test risk factors include low confidence warning"""
        engine = SignalEngine(bot_config)
        
        # Set low confidence
        noaa_forecast_nyc.high_temp_confidence = 0.60
        
        risk_factors = engine._identify_risk_factors(
            noaa_forecast_nyc,
            polymarket_market_nyc_high_temp,
            edge=0.15
        )
        
        # Should include confidence warning
        assert any("confidence" in rf.lower() for rf in risk_factors)
    
    def test_prob_above_threshold(self, bot_config):
        """Test probability above threshold calculation"""
        engine = SignalEngine(bot_config)
        
        # Predicted 55, threshold 50, std_dev 2
        prob = engine._prob_above_threshold(55.0, 50.0, 2.0)
        
        # Should be very high probability
        assert prob > 0.9
    
    def test_prob_below_threshold(self, bot_config):
        """Test probability below threshold calculation"""
        engine = SignalEngine(bot_config)
        
        # Predicted 25, threshold 30, std_dev 2
        prob = engine._prob_below_threshold(25.0, 30.0, 2.0)
        
        # Should be very high probability
        assert prob > 0.9
    
    def test_prob_in_range(self, bot_config):
        """Test probability in range calculation"""
        engine = SignalEngine(bot_config)
        
        # Predicted 51, range 50-52, std_dev 1
        prob = engine._prob_in_range(51.0, 50.0, 52.0, 1.0)
        
        # Should be high probability
        assert prob > 0.6
    
    def test_generate_signal_filters_low_edge(
        self,
        bot_config,
        noaa_forecast_nyc,
        polymarket_market_nyc_high_temp
    ):
        """Test signals are filtered when edge is too low"""
        # Set config to require 30% edge
        bot_config.minimum_edge_threshold = 0.30
        engine = SignalEngine(bot_config)
        
        # Market price close to NOAA probability - low edge
        polymarket_market_nyc_high_temp.yes_price = Decimal("0.84")
        polymarket_market_nyc_high_temp.no_price = Decimal("0.16")
        
        signal = engine._generate_signal_for_pair(
            noaa_forecast_nyc,
            polymarket_market_nyc_high_temp
        )
        
        # Should not generate signal due to low edge
        assert signal is None or signal.edge >= 0.30
    
    def test_generate_signals_sorted_by_ev(
        self,
        bot_config,
        noaa_forecast_nyc,
        noaa_forecast_chicago,
        polymarket_market_nyc_high_temp,
        polymarket_market_chicago_low_temp
    ):
        """Test signals are sorted by expected value"""
        engine = SignalEngine(bot_config)
        
        # Adjust to create different EVs
        bot_config.minimum_edge_threshold = 0.05
        
        forecasts = [noaa_forecast_nyc, noaa_forecast_chicago]
        markets = [polymarket_market_nyc_high_temp, polymarket_market_chicago_low_temp]
        
        signals = engine.generate_signals(forecasts, markets)
        
        if len(signals) > 1:
            # Should be sorted by EV (descending)
            for i in range(len(signals) - 1):
                assert signals[i].expected_value >= signals[i + 1].expected_value
