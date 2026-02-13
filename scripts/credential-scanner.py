#!/usr/bin/env python3
"""Scan for plaintext credentials in workspace files."""

import re
from pathlib import Path

WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
PATTERNS = {
    "API Key": [
        r"api[_-]?key['\"]?\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})",
        r"apikey['\"]?\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})",
        r"key['\"]?\s*[:=]\s*['\"]?sk[_-][a-zA-Z0-9]{20,}",
    ],
    "Token": [
        r"token['\"]?\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})",
        r"bearer['\"]?\s+([a-zA-Z0-9_\-]{20,})",
        r"authorization['\"]?\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})",
    ],
    "Password": [
        r"password['\"]?\s*[:=]\s*['\"]?([^\s'\"]{6,})",
        r"passwd['\"]?\s*[:=]\s*['\"]?([^\s'\"]{6,})",
        r"pwd['\"]?\s*[:=]\s*['\"]?([^\s'\"]{6,})",
    ],
    "Secret": [
        r"secret['\"]?\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{10,})",
        r"client[_-]?secret['\"]?\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{10,})",
    ],
    "AWS Key": [
        r"AKIA[0-9A-Z]{16}",
        r"aws[_-]?access[_-]?key",
    ],
    "Private Key": [
        r"-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----",
    ],
}

EXCLUDE_PATTERNS = [
    "example", "sample", "placeholder", "your_key", "your_token", 
    "REDACTED", "<key>", "${", "TODO", "INSERT"
]

def should_exclude(line):
    """Check if line contains obvious placeholders."""
    line_lower = line.lower()
    return any(excl.lower() in line_lower for excl in EXCLUDE_PATTERNS)

def scan_file(filepath):
    """Scan a single file for credentials."""
    findings = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                if should_exclude(line):
                    continue
                
                for cred_type, patterns in PATTERNS.items():
                    for pattern in patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            # Redact the actual value
                            findings.append({
                                'file': str(filepath.relative_to(WORKSPACE)),
                                'line': line_num,
                                'type': cred_type,
                                'preview': line.strip()[:80] + '...' if len(line.strip()) > 80 else line.strip()
                            })
    except Exception as e:
        pass
    return findings

def main():
    """Scan workspace for credentials."""
    all_findings = []
    
    # Scan MEMORY.md
    memory_file = WORKSPACE / "MEMORY.md"
    if memory_file.exists():
        all_findings.extend(scan_file(memory_file))
    
    # Scan skills directory
    skills_dir = WORKSPACE / "skills"
    if skills_dir.exists():
        for f in skills_dir.rglob("*"):
            if f.is_file() and f.suffix in ['.md', '.json', '.js', '.py', '.sh', '.txt']:
                all_findings.extend(scan_file(f))
    
    # Scan references directory
    refs_dir = WORKSPACE / "references"
    if refs_dir.exists():
        for f in refs_dir.rglob("*"):
            if f.is_file():
                all_findings.extend(scan_file(f))
    
    # Write report
    report_path = WORKSPACE / "research" / "credential-audit.md"
    report_path.parent.mkdir(exist_ok=True)
    
    with open(report_path, 'w') as f:
        f.write("# Credential Audit Report\n\n")
        f.write(f"**Generated:** {Path(__file__).name}\n")
        f.write(f"**Files scanned:** Multiple\n")
        f.write(f"**Findings:** {len(all_findings)}\n\n")
        
        if not all_findings:
            f.write("✅ No plaintext credentials detected.\n\n")
            f.write("(Note: This scanner uses pattern matching and may miss obfuscated credentials.)\n")
        else:
            f.write("## Findings\n\n")
            for finding in all_findings:
                f.write(f"### {finding['type']} found\n")
                f.write(f"- **File:** `{finding['file']}`\n")
                f.write(f"- **Line:** {finding['line']}\n")
                f.write(f"- **Preview:** `{finding['preview']}`\n")
                f.write(f"- **Recommendation:** Move to environment variable or secure vault\n\n")
        
        f.write("## Recommendations\n\n")
        f.write("1. Use environment variables for all API keys and tokens\n")
        f.write("2. Store credentials in `~/.openclaw/config/` (excluded from version control)\n")
        f.write("3. Never commit credentials to git repositories\n")
        f.write("4. Use secret management tools for production credentials\n")
        f.write("5. Rotate any exposed credentials immediately\n")
    
    print(f"✓ Credential audit complete → {report_path}")
    print(f"  Findings: {len(all_findings)}")

if __name__ == "__main__":
    main()
