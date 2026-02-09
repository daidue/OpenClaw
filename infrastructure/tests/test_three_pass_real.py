"""
Tests for recursive-prompting/three-pass-real.py
"""

import pytest
import json
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from recursive_prompting.three_pass_real import (
    LLMIntegration,
    ThreePassProcessor
)

def test_llm_integration_mock_mode():
    """Test LLM integration in mock mode"""
    llm = LLMIntegration(use_openclaw=True)
    
    response = llm.call_llm("Test prompt", temperature=0.7)
    
    assert isinstance(response, str)
    assert len(response) > 0

def test_llm_integration_draft_response():
    """Test that draft generation gets appropriate response"""
    llm = LLMIntegration(use_openclaw=True)
    
    response = llm.call_llm("Generate a solution for X", temperature=0.7)
    
    # Should look like a draft (not critique or refinement)
    assert 'solution' in response.lower() or 'approach' in response.lower()

def test_llm_integration_critique_response():
    """Test that critique gets appropriate response"""
    llm = LLMIntegration(use_openclaw=True)
    
    prompt = """
    Review this draft and identify weaknesses:
    DRAFT: Some solution here
    """
    response = llm.call_llm(prompt, temperature=0.5)
    
    # Should look like a critique
    assert 'weakness' in response.lower() or 'suggestion' in response.lower()

def test_llm_integration_refinement_response():
    """Test that refinement gets appropriate response"""
    llm = LLMIntegration(use_openclaw=True)
    
    prompt = """
    Improve this draft based on critique:
    DRAFT: Original solution
    WEAKNESSES: List of issues
    """
    response = llm.call_llm(prompt, temperature=0.6)
    
    # Should look like a refinement
    assert 'improve' in response.lower() or 'refine' in response.lower() or 'address' in response.lower()

def test_three_pass_processor_initialization():
    """Test processor initialization"""
    processor = ThreePassProcessor(agent_name='test_agent', use_openclaw=True)
    
    assert processor.agent_name == 'test_agent'
    assert processor.llm is not None

def test_pass_1_generate():
    """Test Pass 1 draft generation"""
    processor = ThreePassProcessor(agent_name='bolt', use_openclaw=True)
    
    draft = processor.pass_1_generate(
        prompt="Write a function to validate emails",
        context={'language': 'python'}
    )
    
    # Check structure
    assert draft.output
    assert draft.prompt == "Write a function to validate emails"
    assert draft.agent == 'bolt'
    assert draft.pass_number == 1
    assert isinstance(draft.timestamp, datetime)

def test_pass_2_critique():
    """Test Pass 2 critique generation"""
    processor = ThreePassProcessor(agent_name='bolt', use_openclaw=True)
    
    # First generate a draft
    draft = processor.pass_1_generate("Test prompt", {})
    
    # Then critique it
    critique = processor.pass_2_critique(draft)
    
    # Check structure
    assert critique.weaknesses
    assert critique.suggestions
    assert critique.strengths
    assert 0 <= critique.completeness_score <= 1
    assert 0 <= critique.clarity_score <= 1
    assert critique.pass_number == 2

def test_pass_3_refine():
    """Test Pass 3 refinement"""
    processor = ThreePassProcessor(agent_name='bolt', use_openclaw=True)
    
    # Generate draft and critique
    draft = processor.pass_1_generate("Test prompt", {})
    critique = processor.pass_2_critique(draft)
    
    # Refine
    refined = processor.pass_3_refine(draft, critique)
    
    # Check structure
    assert refined.output
    assert refined.improvements_made
    assert refined.original_draft == draft.output
    assert refined.pass_number == 3

def test_full_three_pass_process():
    """Test complete three-pass flow"""
    processor = ThreePassProcessor(agent_name='bolt', use_openclaw=True)
    
    result = processor.process(
        prompt="Create a deployment script",
        context={'environment': 'production'}
    )
    
    # Check result structure
    assert result.prompt == "Create a deployment script"
    assert result.agent == 'bolt'
    assert result.pass_1_draft
    assert result.pass_2_critique
    assert result.pass_3_refined
    assert result.final_output
    assert result.processing_time_seconds > 0
    assert result.started_at < result.completed_at

def test_three_pass_saves_history(temp_workspace):
    """Test that results are saved to history"""
    processor = ThreePassProcessor(agent_name='bolt', use_openclaw=True)
    
    with pytest.mock.patch('recursive_prompting.three_pass_real.HISTORY_DIR', temp_workspace / "history"):
        result = processor.process("Test prompt")
        
        # Check history file was created
        history_files = list((temp_workspace / "history").glob("bolt-*.json"))
        assert len(history_files) > 0
        
        # Check file content
        with open(history_files[0], 'r') as f:
            saved_data = json.load(f)
        
        assert saved_data['prompt'] == "Test prompt"
        assert saved_data['agent'] == 'bolt'

def test_critique_parsing():
    """Test parsing of critique text"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    critique_text = """
    WEAKNESSES:
    - First weakness
    - Second weakness
    
    SUGGESTIONS:
    - First suggestion
    - Second suggestion
    
    STRENGTHS:
    - First strength
    """
    
    parsed = processor._parse_critique(critique_text)
    
    assert len(parsed['weaknesses']) == 2
    assert len(parsed['suggestions']) == 2
    assert len(parsed['strengths']) == 1
    assert 'First weakness' in parsed['weaknesses']

def test_critique_parsing_various_formats():
    """Test parsing critiques with different bullet formats"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    critique_text = """
    WEAKNESSES:
    - Dash bullet
    • Bullet point
    1. Numbered item
    
    SUGGESTIONS:
    - Another suggestion
    """
    
    parsed = processor._parse_critique(critique_text)
    
    # Should parse all formats
    assert len(parsed['weaknesses']) >= 3
    assert len(parsed['suggestions']) >= 1

def test_improvement_extraction():
    """Test extraction of improvements from refined text"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    refined_text = """
    IMPROVEMENTS MADE:
    - Added error handling
    - Improved performance
    - Better documentation
    
    Here's the refined solution...
    """
    
    critique = pytest.mock.Mock()
    critique.suggestions = ["Suggestion 1", "Suggestion 2"]
    
    improvements = processor._extract_improvements(refined_text, critique)
    
    assert len(improvements) >= 3
    assert any('error handling' in imp.lower() for imp in improvements)

def test_three_pass_error_handling():
    """Test that errors are properly handled and logged"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    # Mock LLM to raise an error
    def mock_error(*args, **kwargs):
        raise Exception("LLM error")
    
    processor.llm.call_llm = mock_error
    
    # Should raise exception with proper logging
    with pytest.raises(Exception):
        processor.process("Test prompt")

def test_build_generation_prompt():
    """Test generation prompt construction"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    prompt = processor._build_generation_prompt(
        "Do task X",
        {'key': 'value'}
    )
    
    assert 'Do task X' in prompt
    assert 'bolt' in prompt
    assert 'key: value' in prompt

def test_build_critique_prompt():
    """Test critique prompt construction"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    draft = pytest.mock.Mock()
    draft.prompt = "Original prompt"
    draft.output = "Draft output"
    
    prompt = processor._build_critique_prompt(draft)
    
    assert 'Original prompt' in prompt
    assert 'Draft output' in prompt
    assert 'WEAKNESSES' in prompt.upper()

def test_build_refinement_prompt():
    """Test refinement prompt construction"""
    processor = ThreePassProcessor(agent_name='bolt')
    
    draft = pytest.mock.Mock()
    draft.prompt = "Original"
    draft.output = "Draft"
    
    critique = pytest.mock.Mock()
    critique.weaknesses = ["Weakness 1"]
    critique.suggestions = ["Suggestion 1"]
    critique.strengths = ["Strength 1"]
    
    prompt = processor._build_refinement_prompt(draft, critique)
    
    assert 'Original' in prompt
    assert 'Draft' in prompt
    assert 'Weakness 1' in prompt
    assert 'Suggestion 1' in prompt
    assert 'Strength 1' in prompt
