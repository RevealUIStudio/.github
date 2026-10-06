#!/usr/bin/env bash
# Fail when profile/README.md still carries a retired Studio price or an em dash.
set -euo pipefail

file="${1:-profile/README.md}"

if [[ ! -f "$file" ]]; then
  echo "error: missing $file" >&2
  exit 1
fi

fail=0

if grep -n $'\u2014' "$file"; then
  echo "error: em dash (U+2014) in $file" >&2
  fail=1
fi

# Retired list prices. Current ladder uses $3,997, $14,500, $1,997, $2,497, $297.
if grep -nE '\$1,500|\$3,500|\$7,500|\$1500|\$3500|\$7500' "$file"; then
  echo "error: retired price in $file" >&2
  fail=1
fi

exit "$fail"
