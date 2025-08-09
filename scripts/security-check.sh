#!/bin/bash

# Security check script for MCP Chat UI
# This script checks for sensitive files that should not be committed to Git

echo "🔒 Running security check for MCP Chat UI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: This script must be run from the mcp-chat-ui root directory${NC}"
    exit 1
fi

# Files that should never be committed
SENSITIVE_FILES=(
    "backend/data/settings/settings.json"
    "backend/data/sessions/sessions.json"
    "backend/.env"
    "backend/.env.local"
    "backend/.env.development.local"
    "backend/.env.test.local"
    "backend/.env.production.local"
    "frontend/.env"
    "frontend/.env.local"
)

# Directories that should never be committed
SENSITIVE_DIRS=(
    "backend/data/sessions/"
    "backend/data/settings/"
    "backend/logs/"
    "frontend/data/"
)

ISSUES_FOUND=0

echo "Checking for sensitive files in Git index..."

# Check if sensitive files are tracked by Git
for file in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        echo -e "${RED}❌ SECURITY ISSUE: $file is tracked by Git!${NC}"
        echo "   Run: git rm --cached $file"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

# Check if sensitive directories contain tracked files
for dir in "${SENSITIVE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        tracked_files=$(git ls-files "$dir" 2>/dev/null)
        if [ -n "$tracked_files" ]; then
            echo -e "${RED}❌ SECURITY ISSUE: Directory $dir contains tracked files:${NC}"
            echo "$tracked_files" | sed 's/^/   /'
            echo "   Run: git rm --cached $dir*"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
done

# Check if .gitignore exists and contains necessary rules
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}❌ SECURITY ISSUE: .gitignore file is missing!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    # Check for essential ignore rules
    REQUIRED_RULES=(
        "backend/data/"
        ".env"
        "*.log"
    )
    
    for rule in "${REQUIRED_RULES[@]}"; do
        if ! grep -q "$rule" .gitignore; then
            echo -e "${YELLOW}⚠️  WARNING: .gitignore missing rule for: $rule${NC}"
        fi
    done
fi

# Check for accidentally committed API keys or secrets in recent commits
echo "Checking recent commits for potential secrets..."
if git log --oneline -10 --grep="api.key\|secret\|password\|token" --ignore-case | grep -q .; then
    echo -e "${YELLOW}⚠️  WARNING: Recent commits mention API keys or secrets${NC}"
    echo "   Please review recent commit messages and content"
fi

# Check for environment variables in code
echo "Checking for hardcoded secrets in code..."
if grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    -E "(api_key|apiKey|secret|password|token)\s*[:=]\s*['\"][^'\"]{10,}" \
    src/ backend/src/ 2>/dev/null | grep -v "example\|test\|mock"; then
    echo -e "${YELLOW}⚠️  WARNING: Potential hardcoded secrets found in code${NC}"
    echo "   Please review the above matches"
fi

# Summary
echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Security check passed! No sensitive files found in Git.${NC}"
else
    echo -e "${RED}❌ Security check failed! Found $ISSUES_FOUND issue(s).${NC}"
    echo "Please fix the issues above before committing."
    exit 1
fi

echo ""
echo "💡 Security tips:"
echo "   - Never commit API keys or credentials"
echo "   - Use environment variables for sensitive configuration"
echo "   - Regularly run this security check"
echo "   - Review .gitignore rules periodically"