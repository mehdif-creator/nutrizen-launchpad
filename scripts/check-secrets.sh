#!/bin/bash

# =============================================================================
# Service Role Key Guard Script
# =============================================================================
# Purpose: Prevent service role key from being bundled in client code
# Usage: Run after build (npm run build)
# Exit code: 0 = safe, 1 = secrets found
# =============================================================================

set -e

DIST_DIR="dist"
EXIT_CODE=0

echo "🔍 Checking for secrets in client bundle..."
echo ""

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Error: $DIST_DIR directory not found. Run 'npm run build' first."
  exit 1
fi

# =============================================================================
# Check 1: Service Role Key Variable Reference
# =============================================================================

echo "Check 1: SUPABASE_SERVICE_ROLE_KEY variable reference..."

if grep -r "SUPABASE_SERVICE_ROLE_KEY" "$DIST_DIR/" 2>/dev/null; then
  echo "❌ CRITICAL: Service role key variable found in client bundle!"
  echo "   Files containing SUPABASE_SERVICE_ROLE_KEY:"
  grep -rl "SUPABASE_SERVICE_ROLE_KEY" "$DIST_DIR/"
  EXIT_CODE=1
else
  echo "✓ No service role key variable references"
fi

echo ""

# =============================================================================
# Check 2: JWT-like Patterns (Potential Keys)
# =============================================================================

echo "Check 2: JWT-like token patterns..."

# Look for JWT patterns (3 base64 segments separated by dots)
# Exclude legitimate URLs and anon keys
POTENTIAL_KEYS=$(grep -rhoE "eyJ[A-Za-z0-9_-]{100,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$DIST_DIR/" 2>/dev/null | \
  grep -v "supabase\.co" | \
  grep -v "PUBLISHABLE_KEY" | \
  grep -v "ANON_KEY" || true)

if [ -n "$POTENTIAL_KEYS" ]; then
  echo "⚠️  WARNING: Potential service role key patterns found:"
  echo "$POTENTIAL_KEYS" | head -5
  echo ""
  echo "   Manual verification required!"
  # Don't exit with error, just warn
else
  echo "✓ No suspicious JWT patterns detected"
fi

echo ""

# =============================================================================
# Check 3: Common Secret Patterns
# =============================================================================

echo "Check 3: Other secret patterns..."

SECRET_PATTERNS=(
  "sk_live_"
  "sk_test_"
  "stripe.*secret"
  "api[_-]?secret"
  "private[_-]?key"
  "secret[_-]?key"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -rE "$pattern" "$DIST_DIR/" 2>/dev/null | grep -v "\.map$"; then
    echo "⚠️  Found pattern: $pattern"
  fi
done

echo "✓ Secret pattern scan complete"
echo ""

# =============================================================================
# Check 4: Hardcoded URLs/Endpoints
# =============================================================================

echo "Check 4: Hardcoded sensitive endpoints..."

# Check for common sensitive patterns
if grep -rE "(localhost|127\.0\.0\.1|192\.168)" "$DIST_DIR/" 2>/dev/null | grep -v "\.map$" | head -3; then
  echo "⚠️  WARNING: Development URLs found in bundle"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "================================"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Secret check PASSED"
  echo "   No service role key found in client bundle"
else
  echo "❌ Secret check FAILED"
  echo "   Service role key detected in client code!"
  echo ""
  echo "Action required:"
  echo "1. Remove SUPABASE_SERVICE_ROLE_KEY from client-side code"
  echo "2. Use service role key only in edge functions"
  echo "3. Use SUPABASE_ANON_KEY for client-side operations"
fi
echo "================================"

exit $EXIT_CODE
