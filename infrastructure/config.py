"""
Centralized configuration management for infrastructure
Uses environment variables with sensible defaults
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class InfrastructureSettings(BaseSettings):
    """Global infrastructure configuration"""
    
    # Paths
    workspace_path: Path = Field(
        default=Path.home() / ".openclaw" / "workspace",
        description="Root workspace directory"
    )
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_dir: Optional[Path] = Field(None, description="Log directory (default: workspace/logs)")
    log_rotation_mb: int = Field(default=10, description="Log file size before rotation (MB)")
    log_backup_count: int = Field(default=5, description="Number of backup log files")
    
    # Vector Memory
    enable_vector_memory: bool = Field(default=True, description="Enable vector memory system")
    sentence_transformer_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="SentenceTransformer model name"
    )
    faiss_index_type: str = Field(
        default="flat",
        description="FAISS index type (flat, ivf, hnsw)"
    )
    vector_chunk_size: int = Field(default=500, description="Chunk size for text splitting")
    vector_chunk_overlap: float = Field(default=0.5, description="Chunk overlap ratio")
    
    # Hourly Summarizer
    enable_hourly_summarizer: bool = Field(default=True, description="Enable hourly summarizer")
    summarizer_active_hours_start: int = Field(default=8, description="Start hour for summarizer (24h format)")
    summarizer_active_hours_end: int = Field(default=22, description="End hour for summarizer (24h format)")
    
    # Compaction
    compaction_check_interval_seconds: int = Field(default=300, description="Compaction check interval")
    compaction_token_threshold: int = Field(default=150000, description="Token threshold for compaction")
    
    # Feedback Router
    enable_feedback_router: bool = Field(default=True, description="Enable feedback router")
    telegram_bot_token: Optional[str] = Field(None, description="Telegram bot token")
    telegram_default_channel: Optional[str] = Field(None, description="Default Telegram channel")
    
    # Three-Pass Prompting
    enable_three_pass: bool = Field(default=True, description="Enable three-pass prompting")
    three_pass_use_openclaw: bool = Field(default=True, description="Use OpenClaw for LLM calls")
    three_pass_temperature_draft: float = Field(default=0.7, description="Temperature for draft generation")
    three_pass_temperature_critique: float = Field(default=0.5, description="Temperature for critique")
    three_pass_temperature_refine: float = Field(default=0.6, description="Temperature for refinement")
    anthropic_api_key: Optional[str] = Field(None, description="Anthropic API key (if not using OpenClaw)")
    
    # Voice Pipeline
    enable_voice_pipeline: bool = Field(default=True, description="Enable voice pipeline")
    whisper_model: str = Field(default="base", description="Whisper model size")
    voice_check_interval_seconds: int = Field(default=900, description="Voice note check interval (15 min)")
    
    # Cross-Agent Intelligence
    enable_cross_agent: bool = Field(default=True, description="Enable cross-agent intelligence")
    signal_relevance_threshold: float = Field(default=0.5, description="Minimum relevance for cross-agent signals")
    
    # Health Checks
    health_check_interval_seconds: int = Field(default=300, description="Health check interval")
    health_check_timeout_seconds: int = Field(default=30, description="Health check timeout")
    
    # Backups
    enable_backups: bool = Field(default=True, description="Enable automated backups")
    backup_interval_hours: int = Field(default=24, description="Backup interval (hours)")
    backup_retention_days_vector: int = Field(default=7, description="Backup retention for vector memory")
    backup_retention_days_feedback: int = Field(default=30, description="Backup retention for feedback")
    
    # Performance
    max_concurrent_whisper_instances: int = Field(default=1, description="Max concurrent Whisper instances")
    enable_gpu: bool = Field(default=False, description="Enable GPU acceleration")
    
    model_config = SettingsConfigDict(
        env_prefix='OPENCLAW_INFRA_',
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False
    )
    
    def get_log_dir(self) -> Path:
        """Get log directory path"""
        if self.log_dir:
            return self.log_dir
        return self.workspace_path / "logs"
    
    def get_vector_dir(self) -> Path:
        """Get vector memory directory"""
        return self.workspace_path / "memory" / "vector"
    
    def get_memory_dir(self) -> Path:
        """Get memory directory"""
        return self.workspace_path / "memory"
    
    def get_feedback_dir(self) -> Path:
        """Get feedback directory"""
        return self.workspace_path / "feedback"
    
    def ensure_directories(self):
        """Create all necessary directories"""
        directories = [
            self.workspace_path,
            self.get_log_dir(),
            self.get_vector_dir(),
            self.get_memory_dir() / "hourly",
            self.get_feedback_dir() / "pending",
            self.get_feedback_dir() / "archive",
            self.workspace_path / "voice",
            self.workspace_path / "backups",
            self.workspace_path / "temp",
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def validate_config(self) -> list[str]:
        """Validate configuration and return list of issues"""
        issues = []
        
        # Check telegram config if enabled
        if self.enable_feedback_router and not self.telegram_bot_token:
            issues.append("Feedback router enabled but TELEGRAM_BOT_TOKEN not set")
        
        # Check Anthropic API if three-pass not using OpenClaw
        if self.enable_three_pass and not self.three_pass_use_openclaw and not self.anthropic_api_key:
            issues.append("Three-pass enabled with direct API but ANTHROPIC_API_KEY not set")
        
        # Check workspace exists and is writable
        if self.workspace_path.exists():
            test_file = self.workspace_path / ".write_test"
            try:
                test_file.touch()
                test_file.unlink()
            except Exception as e:
                issues.append(f"Workspace not writable: {e}")
        
        # Validate numeric ranges
        if not 0 <= self.summarizer_active_hours_start <= 23:
            issues.append("summarizer_active_hours_start must be 0-23")
        
        if not 0 <= self.summarizer_active_hours_end <= 23:
            issues.append("summarizer_active_hours_end must be 0-23")
        
        if self.summarizer_active_hours_start >= self.summarizer_active_hours_end:
            issues.append("summarizer_active_hours_end must be after start")
        
        if not 0 < self.three_pass_temperature_draft <= 1.0:
            issues.append("three_pass_temperature_draft must be 0-1")
        
        return issues


# Global settings instance
_settings: Optional[InfrastructureSettings] = None

def get_settings() -> InfrastructureSettings:
    """Get or create global settings instance"""
    global _settings
    if _settings is None:
        _settings = InfrastructureSettings()
        _settings.ensure_directories()
    return _settings

def reload_settings():
    """Reload settings (useful for testing)"""
    global _settings
    _settings = None
    return get_settings()


# Example .env file content
EXAMPLE_ENV = """
# Infrastructure Configuration
# Copy this to .env and customize

# Workspace
OPENCLAW_INFRA_WORKSPACE_PATH=/Users/yourusername/.openclaw/workspace

# Logging
OPENCLAW_INFRA_LOG_LEVEL=INFO
OPENCLAW_INFRA_LOG_ROTATION_MB=10

# Vector Memory
OPENCLAW_INFRA_SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
OPENCLAW_INFRA_VECTOR_CHUNK_SIZE=500

# Telegram
OPENCLAW_INFRA_TELEGRAM_BOT_TOKEN=your_bot_token_here
OPENCLAW_INFRA_TELEGRAM_DEFAULT_CHANNEL=@your_channel

# Three-Pass LLM
OPENCLAW_INFRA_THREE_PASS_USE_OPENCLAW=true
OPENCLAW_INFRA_ANTHROPIC_API_KEY=sk-ant-...

# Whisper
OPENCLAW_INFRA_WHISPER_MODEL=base

# Performance
OPENCLAW_INFRA_MAX_CONCURRENT_WHISPER_INSTANCES=1
OPENCLAW_INFRA_ENABLE_GPU=false

# Backups
OPENCLAW_INFRA_ENABLE_BACKUPS=true
OPENCLAW_INFRA_BACKUP_INTERVAL_HOURS=24
"""

def create_example_env(path: Path = Path(".env.example")):
    """Create example .env file"""
    with open(path, 'w') as f:
        f.write(EXAMPLE_ENV)
    print(f"Created example config at {path}")


if __name__ == "__main__":
    # Test configuration
    settings = get_settings()
    print("Configuration loaded:")
    print(f"  Workspace: {settings.workspace_path}")
    print(f"  Log level: {settings.log_level}")
    print(f"  Vector memory: {settings.enable_vector_memory}")
    print(f"  Three-pass: {settings.enable_three_pass}")
    
    # Validate
    issues = settings.validate_config()
    if issues:
        print("\n⚠️  Configuration issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\n✓ Configuration valid")
    
    # Create example env
    create_example_env()
