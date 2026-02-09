"""
Pydantic models for data validation across infrastructure
All data structures should use these models for validation
"""

from pydantic import BaseModel, Field, validator, field_validator
from typing import List, Dict, Optional, Literal, Any
from datetime import datetime
from pathlib import Path

# ============================================================================
# Context Retention Models
# ============================================================================

class ConversationMetadata(BaseModel):
    """Metadata for a conversation added to vector memory"""
    timestamp: datetime = Field(default_factory=datetime.now)
    agent: str = Field(..., min_length=1, max_length=50)
    session: str = Field(..., min_length=1, max_length=100)
    chunk_index: Optional[int] = Field(None, ge=0)
    total_chunks: Optional[int] = Field(None, ge=1)
    
    @field_validator('agent')
    @classmethod
    def validate_agent(cls, v):
        # Only allow alphanumeric and underscores
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Agent name must be alphanumeric')
        return v.lower()

class VectorSearchResult(BaseModel):
    """Result from vector memory search"""
    text: str
    similarity: float = Field(..., ge=0.0, le=1.0)
    rank: int = Field(..., ge=1)
    timestamp: datetime
    agent: str
    session: str
    chunk_index: Optional[int] = None
    total_chunks: Optional[int] = None

class VectorMemoryStats(BaseModel):
    """Statistics about vector memory"""
    total_vectors: int = Field(..., ge=0)
    dimension: int = Field(..., gt=0)
    metadata_entries: int = Field(..., ge=0)
    index_file: str
    size_mb: float = Field(..., ge=0)

class HourlyActivity(BaseModel):
    """Parsed hourly activity summary"""
    topics: List[str] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    tools: Dict[str, int] = Field(default_factory=dict)
    stats: Dict[str, int] = Field(default_factory=dict)
    
    @field_validator('topics')
    @classmethod
    def validate_topics(cls, v):
        # Remove duplicates and empty strings
        return sorted(list(set(t.strip() for t in v if t.strip())))
    
    @field_validator('tools')
    @classmethod
    def validate_tools(cls, v):
        # Ensure all counts are positive
        return {k: count for k, count in v.items() if count > 0}

class CompactionConfig(BaseModel):
    """Configuration for compaction detection"""
    check_interval_seconds: int = Field(300, gt=0)
    token_threshold: int = Field(150000, gt=0)
    last_compaction_file: Path
    
    class Config:
        arbitrary_types_allowed = True

# ============================================================================
# Feedback Router Models
# ============================================================================

class FeedbackType(str):
    """Valid feedback types"""
    APPROVE = "approve"
    REJECT = "reject"
    EDIT = "edit"
    SKIP = "skip"

class FeedbackEntry(BaseModel):
    """Single feedback entry"""
    timestamp: datetime = Field(default_factory=datetime.now)
    type: Literal["approve", "reject", "edit", "skip"]
    agent: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    reason: Optional[str] = None
    category: str = Field(default="general")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        valid_types = ["approve", "reject", "edit", "skip"]
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v

class Recommendation(BaseModel):
    """Telegram recommendation"""
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    category: str = Field(default="general")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
    status: Literal["pending", "approved", "rejected", "edit_requested", "skipped"]
    
    # Optional fields for resolved recommendations
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    edit_requested_at: Optional[datetime] = None
    edit_requested_by: Optional[str] = None
    skipped_at: Optional[datetime] = None
    skipped_by: Optional[str] = None

class TelegramCallbackResponse(BaseModel):
    """Response from handling Telegram callback"""
    success: bool
    message: str
    action: Optional[str] = None
    recommendation: Optional[Recommendation] = None
    needs_reason: bool = False
    needs_edits: bool = False

# ============================================================================
# Recursive Prompting Models
# ============================================================================

class ThreePassDraft(BaseModel):
    """Pass 1: Draft output"""
    output: str = Field(..., min_length=1)
    prompt: str
    context: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)
    pass_number: Literal[1] = 1
    agent: str

class ThreePassCritique(BaseModel):
    """Pass 2: Critique"""
    critique_prompt: str
    weaknesses: List[str]
    suggestions: List[str]
    strengths: List[str]
    completeness_score: float = Field(..., ge=0.0, le=1.0)
    clarity_score: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.now)
    pass_number: Literal[2] = 2

class ThreePassRefined(BaseModel):
    """Pass 3: Refined output"""
    output: str = Field(..., min_length=1)
    refinement_prompt: str
    improvements_made: List[str]
    timestamp: datetime = Field(default_factory=datetime.now)
    pass_number: Literal[3] = 3
    original_draft: str

class ThreePassResult(BaseModel):
    """Complete three-pass result"""
    prompt: str
    context: Dict[str, Any] = Field(default_factory=dict)
    agent: str
    pass_1_draft: ThreePassDraft
    pass_2_critique: ThreePassCritique
    pass_3_refined: ThreePassRefined
    final_output: str
    processing_time_seconds: float = Field(..., gt=0)
    started_at: datetime
    completed_at: datetime

# ============================================================================
# Voice Pipeline Models
# ============================================================================

class TranscriptionResult(BaseModel):
    """Result from Whisper transcription"""
    text: str
    language: Optional[str] = None
    duration_seconds: Optional[float] = Field(None, gt=0)
    segments: List[Dict[str, Any]] = Field(default_factory=list)
    transcription_time_seconds: Optional[float] = Field(None, gt=0)
    
    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Transcription text cannot be empty')
        return v.strip()

class Priority(BaseModel):
    """Single priority item"""
    text: str = Field(..., min_length=1)
    agent: Optional[str] = None
    source: str = Field(default="manual")
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        # Remove extra whitespace
        return ' '.join(v.split())

class PriorityList(BaseModel):
    """List of priorities"""
    priorities: List[Priority]
    last_updated: datetime = Field(default_factory=datetime.now)
    
    @field_validator('priorities')
    @classmethod
    def validate_priorities(cls, v):
        # Remove exact duplicates
        seen = set()
        unique = []
        for p in v:
            key = (p.text.lower(), p.agent)
            if key not in seen:
                seen.add(key)
                unique.append(p)
        return unique

# ============================================================================
# Cross-Agent Models
# ============================================================================

class CrossAgentSignal(BaseModel):
    """Signal for cross-agent intelligence"""
    signal_type: Literal["entity_mentioned", "decision_made", "mistake_identified", "learning"]
    entity: str
    context: str
    source_agent: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    relevance_score: float = Field(0.5, ge=0.0, le=1.0)

class DailySyncData(BaseModel):
    """Daily cross-agent sync data"""
    date: datetime
    agent: str
    summary: str
    key_learnings: List[str] = Field(default_factory=list)
    mistakes: List[str] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    signals_sent: int = Field(0, ge=0)
    signals_received: int = Field(0, ge=0)

# ============================================================================
# Memory Compound Models
# ============================================================================

class MistakeEntry(BaseModel):
    """Tracked mistake"""
    timestamp: datetime = Field(default_factory=datetime.now)
    agent: str
    description: str = Field(..., min_length=1)
    category: str = Field(default="general")
    severity: Literal["minor", "major", "critical"] = "major"
    root_cause: Optional[str] = None
    prevention: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class WeeklySynthesis(BaseModel):
    """Weekly synthesis of learnings"""
    week_start: datetime
    week_end: datetime
    total_feedback_entries: int = Field(..., ge=0)
    approvals: int = Field(..., ge=0)
    rejections: int = Field(..., ge=0)
    edits: int = Field(..., ge=0)
    skips: int = Field(..., ge=0)
    key_patterns: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    mistakes_by_category: Dict[str, int] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=datetime.now)

# ============================================================================
# Health Check Models
# ============================================================================

class ComponentHealth(BaseModel):
    """Health status of a component"""
    name: str
    status: Literal["healthy", "degraded", "unhealthy"]
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    checked_at: datetime = Field(default_factory=datetime.now)

class SystemHealth(BaseModel):
    """Overall system health"""
    overall_status: Literal["healthy", "degraded", "unhealthy"]
    components: List[ComponentHealth]
    checked_at: datetime = Field(default_factory=datetime.now)
    
    @field_validator('overall_status')
    @classmethod
    def compute_overall_status(cls, v, values):
        # Overall is unhealthy if any component is unhealthy
        # Overall is degraded if any component is degraded
        # Otherwise healthy
        if 'components' in values.data:
            statuses = [c.status for c in values.data['components']]
            if 'unhealthy' in statuses:
                return 'unhealthy'
            if 'degraded' in statuses:
                return 'degraded'
        return 'healthy'

# ============================================================================
# Configuration Models
# ============================================================================

class InfrastructureConfig(BaseModel):
    """Global infrastructure configuration"""
    workspace_path: Path
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    enable_vector_memory: bool = True
    enable_hourly_summarizer: bool = True
    enable_feedback_router: bool = True
    enable_cross_agent: bool = True
    whisper_model: str = "base"
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    faiss_index_type: Literal["flat", "ivf", "hnsw"] = "flat"
    
    class Config:
        arbitrary_types_allowed = True
    
    @field_validator('workspace_path')
    @classmethod
    def validate_workspace(cls, v):
        if not v.exists():
            v.mkdir(parents=True, exist_ok=True)
        return v

# ============================================================================
# Validation Helpers
# ============================================================================

def validate_agent_name(name: str) -> str:
    """Validate and normalize agent name"""
    name = name.strip().lower()
    if not name:
        raise ValueError("Agent name cannot be empty")
    if not name.replace('_', '').replace('-', '').isalnum():
        raise ValueError("Agent name must be alphanumeric (underscores/hyphens allowed)")
    return name

def validate_file_path(path: Path, must_exist: bool = False) -> Path:
    """Validate file path"""
    if must_exist and not path.exists():
        raise ValueError(f"Path does not exist: {path}")
    
    # Check for path traversal
    try:
        path.resolve()
    except Exception as e:
        raise ValueError(f"Invalid path: {e}")
    
    return path

def validate_json_data(data: str, model: BaseModel) -> BaseModel:
    """Validate JSON string against Pydantic model"""
    import json
    try:
        parsed = json.loads(data)
        return model(**parsed)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")
    except Exception as e:
        raise ValueError(f"Validation failed: {e}")
