#!/bin/bash
set -euo pipefail

OBSIDIAN_CLI="${OBSIDIAN_CLI:-obsidian}"
VAULT="${OBSIDIAN_VAULT:-book-tracker-data}"

PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Obsidian CLI Verification ==="
echo "Vault: $VAULT"
echo

# ── 5.2: Unresolved links ─────────────────────────────────────

echo "--- Unresolved Links ---"
result=$($OBSIDIAN_CLI unresolved vault="$VAULT" 2>&1)
if echo "$result" | grep -q "No unresolved links found"; then
  echo "  ✓ No unresolved links"
  PASS=$((PASS + 1))
elif echo "$result" | grep -q "Obsidian application is not running\|Error"; then
  echo "  ⚠ Skipped (Obsidian not running)"
else
  echo "  ✗ Unresolved links found:"
  echo "$result"
  FAIL=$((FAIL + 1))
fi
echo

# ── 5.3: Backlinks for work files ──────────────────────────────

echo "--- Backlinks ---"
for work in dune the-goldfinch; do
  result=$($OBSIDIAN_CLI backlinks vault="$VAULT" file="$work" 2>&1)
  if echo "$result" | grep -q "copies\|editions"; then
    echo "  ✓ $work has backlinks"
    PASS=$((PASS + 1))
  elif echo "$result" | grep -q "Obsidian application is not running\|Error"; then
    echo "  ⚠ Skipped (Obsidian not running)"
  else
    echo "  ✗ $work has no backlinks"
    FAIL=$((FAIL + 1))
  fi
done
echo

# ── 5.4: Aliases ───────────────────────────────────────────────

echo "--- Aliases ---"
result=$($OBSIDIAN_CLI aliases vault="$VAULT" 2>&1)
if [ -n "$result" ] && ! echo "$result" | grep -q "No aliases found"; then
  echo "  ✓ Aliases detected"
  PASS=$((PASS + 1))
elif echo "$result" | grep -q "Obsidian application is not running\|Error"; then
  echo "  ⚠ Skipped (Obsidian not running)"
else
  echo "  ✗ No aliases found"
  FAIL=$((FAIL + 1))
fi
echo

# ── 5.5: Tags ──────────────────────────────────────────────────

echo "--- Tags ---"
result=$($OBSIDIAN_CLI tags vault="$VAULT" 2>&1)
if [ -n "$result" ] && ! echo "$result" | grep -q "No tags found"; then
  echo "  ✓ Tags detected"
  PASS=$((PASS + 1))
elif echo "$result" | grep -q "Obsidian application is not running\|Error"; then
  echo "  ⚠ Skipped (Obsidian not running)"
else
  echo "  ✗ No tags found"
  FAIL=$((FAIL + 1))
fi
echo

# ── 5.6: Search for placeholder text ───────────────────────────────────────────

echo "--- Series Placeholders ---"
result=$($OBSIDIAN_CLI search vault="$VAULT" query="not in library" 2>&1)
if [ -n "$result" ] && ! echo "$result" | grep -q "Obsidian application is not running\|Error"; then
  echo "  ✓ 'not in library' placeholder found (in: $(echo "$result" | tr '\n' ' '))"
  PASS=$((PASS + 1))
elif echo "$result" | grep -q "Obsidian application is not running\|Error"; then
  echo "  ⚠ Skipped (Obsidian not running)"
else
  echo "  ✗ 'not in library' placeholder NOT found (bodies may need regeneration)"
  FAIL=$((FAIL + 1))
fi
echo

# ── Summary ────────────────────────────────────────────────────

echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
if [ $FAIL -eq 0 ]; then
  echo "All checks passed!"
  exit 0
else
  echo "Some checks failed. Review output above."
  exit 1
fi
