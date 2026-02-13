#!/usr/bin/env python3
"""Generate and verify SHA-256 checksums for skill files."""

import hashlib
import json
from pathlib import Path

SKILLS_DIR = Path("/Users/jeffdaniels/.openclaw/workspace/skills")
CHECKSUMS_FILE = SKILLS_DIR / "checksums.json"

def hash_file(filepath):
    """Generate SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def generate_checksums():
    """Generate checksums for all SKILL.md files."""
    checksums = {}
    for skill_file in SKILLS_DIR.glob("*/SKILL.md"):
        relative_path = str(skill_file.relative_to(SKILLS_DIR))
        checksums[relative_path] = hash_file(skill_file)
    return checksums

def verify_checksums():
    """Compare current checksums with stored ones."""
    if not CHECKSUMS_FILE.exists():
        print("No existing checksums found. Generate first.")
        return
    
    with open(CHECKSUMS_FILE, 'r') as f:
        stored = json.load(f)
    
    current = generate_checksums()
    changes = []
    
    for path, stored_hash in stored.items():
        current_hash = current.get(path)
        if current_hash != stored_hash:
            changes.append(f"CHANGED: {path}")
    
    for path in current:
        if path not in stored:
            changes.append(f"NEW: {path}")
    
    if changes:
        print("Changes detected:")
        for change in changes:
            print(f"  {change}")
    else:
        print("All checksums match. No changes detected.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        verify_checksums()
    else:
        checksums = generate_checksums()
        with open(CHECKSUMS_FILE, 'w') as f:
            json.dump(checksums, f, indent=2)
        print(f"Generated checksums for {len(checksums)} files → {CHECKSUMS_FILE}")
