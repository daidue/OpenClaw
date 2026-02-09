#!/usr/bin/env python3
"""
Shared logging configuration for all infrastructure components
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
LOG_DIR = WORKSPACE / "logs" / "infrastructure"

def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """
    Set up a logger with both file and console output
    
    Args:
        name: Logger name (usually __name__ from calling module)
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger(name)
    
    # Set level
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Format
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler with rotation
    log_file = LOG_DIR / f"{name.replace('.', '_')}.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    return logger

# Alias for backward compatibility
setup_logging = setup_logger
