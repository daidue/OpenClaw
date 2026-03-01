#!/bin/bash

# Scan for duplicate patterns that might benefit from shared libraries
# Run from titlerun-api root

echo "=== TitleRun Codebase Pattern Scan ==="
echo "Date: $(date)"
echo ""

echo "## 1. ID Validation (Should use @titlerun/validation)"
echo "Files with Number.isFinite/isInteger:"
grep -r "Number.isFinite\|Number.isInteger" src/ 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u
echo "Count: $(grep -r "Number.isFinite\|Number.isInteger" src/ 2>/dev/null | grep -v node_modules | wc -l)"
echo ""

echo "## 2. Email Validation (Candidate for library)"
echo "Files with email regex:"
grep -r "test.*@.*\." src/ 2>/dev/null | grep -v node_modules | grep -v "email" | head -10
echo "Count: $(grep -r "test.*@.*\." src/ 2>/dev/null | grep -v node_modules | grep -v "email" | wc -l)"
echo ""

echo "## 3. Date Manipulation (Candidate for library)"
echo "Files with new Date() calls:"
grep -r "new Date" src/ 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u | head -10
echo "Count: $(grep -r "new Date" src/ 2>/dev/null | grep -v node_modules | wc -l)"
echo ""

echo "## 4. URL Validation (Candidate for library)"
echo "Files with URL regex:"
grep -r "http.*://" src/ 2>/dev/null | grep -v node_modules | grep -v "//.*http" | head -10
echo "Count: $(grep -r "http.*://" src/ 2>/dev/null | grep -v node_modules | grep -v "//.*http" | wc -l)"
echo ""

echo "## 5. Password/Security Patterns"
echo "Files with password/hash/crypto:"
grep -r "password\|bcrypt\|crypto" src/ 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u
echo "Count: $(grep -r "password\|bcrypt\|crypto" src/ 2>/dev/null | grep -v node_modules | wc -l)"
echo ""

echo "## 6. Error Handling Patterns"
echo "Files with try/catch:"
grep -r "try {" src/ 2>/dev/null | grep -v node_modules | wc -l
echo "Count: $(grep -r "try {" src/ 2>/dev/null | grep -v node_modules | wc -l)"
echo ""

echo "## 7. Duplicate Utility Functions"
echo "Files with 'function ' declarations:"
grep -r "^function " src/ 2>/dev/null | grep -v node_modules | cut -d: -f1 | sort -u
echo "Count: $(grep -r "^function " src/ 2>/dev/null | grep -v node_modules | wc -l)"
echo ""

echo "=== Scan Complete ==="
echo "Next steps:"
echo "1. Review files with duplicate patterns"
echo "2. Consider extracting to @titlerun/validation or new libraries"
echo "3. Create migration plan for high-frequency patterns"
