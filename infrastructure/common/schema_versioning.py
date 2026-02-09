#!/usr/bin/env python3
"""
Schema Versioning Utility
Ensures all JSON files have version numbers for forward/backward compatibility
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Current schema versions for each data type
SCHEMA_VERSIONS = {
    'feedback': '1.0',
    'recommendation': '1.0',
    'vector_metadata': '1.0',
    'daily_sync': '1.0',
    'weekly_synthesis': '1.0',
    'extraction': '1.0',
    'priority_history': '1.0',
    'cross_signal': '1.0',
    'three_pass_result': '1.0'
}

def wrap_with_schema(data: Dict[str, Any], schema_type: str) -> Dict[str, Any]:
    """
    Wrap data with schema version
    
    Args:
        data: The data to wrap
        schema_type: Type of schema (e.g., 'feedback', 'recommendation')
    
    Returns:
        Wrapped data with schema version and metadata
    """
    version = SCHEMA_VERSIONS.get(schema_type, '1.0')
    
    return {
        '_schema': {
            'type': schema_type,
            'version': version,
            'created_at': datetime.now().isoformat()
        },
        'data': data
    }

def unwrap_schema(wrapped: Dict[str, Any]) -> tuple[Dict[str, Any], Optional[str]]:
    """
    Unwrap data and return version
    
    Args:
        wrapped: Wrapped data with schema
    
    Returns:
        Tuple of (data, version)
    """
    if '_schema' in wrapped:
        return wrapped['data'], wrapped['_schema'].get('version')
    else:
        # Legacy data without schema
        return wrapped, None

def validate_schema_version(wrapped: Dict[str, Any], schema_type: str, min_version: str = None) -> bool:
    """
    Validate schema version
    
    Args:
        wrapped: Wrapped data
        schema_type: Expected schema type
        min_version: Minimum required version (optional)
    
    Returns:
        True if valid, False otherwise
    """
    if '_schema' not in wrapped:
        return False
    
    schema = wrapped['_schema']
    
    if schema.get('type') != schema_type:
        return False
    
    if min_version:
        # Simple version comparison (assumes X.Y format)
        current = tuple(map(int, schema.get('version', '0.0').split('.')))
        required = tuple(map(int, min_version.split('.')))
        
        if current < required:
            return False
    
    return True

def save_with_schema(path: Path, data: Dict[str, Any], schema_type: str):
    """
    Save data with schema version
    
    Args:
        path: File path
        data: Data to save
        schema_type: Schema type
    """
    wrapped = wrap_with_schema(data, schema_type)
    
    with open(path, 'w') as f:
        json.dump(wrapped, f, indent=2)

def load_with_schema(path: Path, schema_type: str = None) -> tuple[Dict[str, Any], Optional[str]]:
    """
    Load data with schema version
    
    Args:
        path: File path
        schema_type: Expected schema type (optional, for validation)
    
    Returns:
        Tuple of (data, version)
    
    Raises:
        ValueError if schema type doesn't match
    """
    with open(path, 'r') as f:
        wrapped = json.load(f)
    
    if schema_type and not validate_schema_version(wrapped, schema_type):
        data, version = unwrap_schema(wrapped)
        if version is None:
            # Legacy data, return as-is
            return wrapped, None
        else:
            raise ValueError(f"Schema type mismatch: expected {schema_type}, got {wrapped.get('_schema', {}).get('type')}")
    
    return unwrap_schema(wrapped)


def migrate_legacy_file(path: Path, schema_type: str) -> bool:
    """
    Migrate legacy file to versioned format
    
    Args:
        path: Path to legacy file
        schema_type: Schema type to apply
    
    Returns:
        True if migrated, False if already versioned or error
    """
    try:
        with open(path, 'r') as f:
            data = json.load(f)
        
        # Check if already versioned
        if '_schema' in data:
            return False
        
        # Backup original
        backup_path = path.with_suffix(path.suffix + '.pre-migration')
        with open(backup_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        # Wrap and save
        save_with_schema(path, data, schema_type)
        
        print(f"✓ Migrated {path.name} to schema v{SCHEMA_VERSIONS[schema_type]}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to migrate {path}: {e}")
        return False


if __name__ == "__main__":
    # Demo
    print("Schema Versioning Demo\n")
    
    # Create sample data
    sample_data = {
        'id': 'test-001',
        'timestamp': datetime.now().isoformat(),
        'content': 'Sample content'
    }
    
    # Wrap with schema
    wrapped = wrap_with_schema(sample_data, 'feedback')
    print("Wrapped data:")
    print(json.dumps(wrapped, indent=2))
    
    # Unwrap
    data, version = unwrap_schema(wrapped)
    print(f"\nUnwrapped data (version {version}):")
    print(json.dumps(data, indent=2))
    
    # Validate
    is_valid = validate_schema_version(wrapped, 'feedback', min_version='1.0')
    print(f"\nValid: {is_valid}")
