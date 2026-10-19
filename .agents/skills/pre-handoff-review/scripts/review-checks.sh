#!/usr/bin/env bash
# Usage: bash .agents/skills/pre-handoff-review/scripts/review-checks.sh [repo-root]
# Exit 1 on hard failures. Lines marked REVIEW need a human decision.
ROOT="${1:-.}"
cd "$ROOT" || { echo "cannot cd to $ROOT"; exit 2; }
fail=0
section() { printf '\n== %s ==\n' "$1"; }

GS_FILES=$(ls ./*.gs 2>/dev/null | grep -vE "_backup\.gs$|\.bak\.gs$")
SRC_DIRS=""
[ -d src ] && SRC_DIRS="src"
EXCL="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=.git_corrupted --exclude-dir=src_backup"

section "1. Duplicate top-level declarations across .gs files (all .gs share one global scope)"
if [ -n "$GS_FILES" ]; then
  dups=$(grep -hoE "^(const|let|var) [A-Za-z0-9_]+|^function [A-Za-z0-9_]+" $GS_FILES | sed -E 's/^(const|let|var|function) //' | sort | uniq -d)
  if [ -n "$dups" ]; then echo "FAIL duplicate names:"; echo "$dups" | sed 's/^/  /'; fail=1; else echo "OK"; fi
else echo "no .gs files found"; fi

section "2. Public .gs functions (no trailing underscore) without requireAuth_/requireRole_/validateToken_"
if [ -n "$GS_FILES" ]; then
  awk '
    function flush() { if (name != "" && name !~ /_$/ && !auth && name !~ /^(login|getBootstrapStatus|initialSetup|doGet)$/) print "REVIEW  " file ": " name }
    /^function [A-Za-z0-9_]+\(/ { flush(); match($0, /function [A-Za-z0-9_]+/); name = substr($0, RSTART + 9, RLENGTH - 9); auth = 0; file = FILENAME }
    /requireAuth_|requireRole_|validateToken_/ { auth = 1 }
    END { flush() }
  ' $GS_FILES
  echo "(each REVIEW line must be justified, for example guarded by a Script Property flag)"
fi

section "2b. Public functions that take a sheet name (generic data access MUST be private)"
if [ -n "$GS_FILES" ]; then
  pub=$(grep -nE "^function [A-Za-z0-9_]*[A-Za-z0-9]\([[:space:]]*sheetName" $GS_FILES | cut -c1-110)
  if [ -n "$pub" ]; then echo "FAIL any visitor can call these from the browser console (read _Sessions/Users, overwrite tables). Add a trailing underscore:"; echo "$pub" | sed 's/^/  /'; fail=1; else echo "OK"; fi
fi

section "3. Client calls that have no matching server function"
if [ -f src/dataService.ts ] && [ -n "$GS_FILES" ]; then
  miss=0
  for f in $(grep -oE "runGasFunction\('[A-Za-z0-9_]+'" src/dataService.ts | sed "s/runGasFunction('//;s/'//" | sort -u); do
    if ! grep -hqE "^function $f\(" $GS_FILES; then echo "FAIL missing on server: $f"; fail=1; miss=1; fi
  done
  [ $miss -eq 0 ] && echo "OK (names match; still compare payload keys by hand)"
fi

section "4. HTML injection sinks"
n=$(grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|dangerouslySetInnerHTML" $EXCL $SRC_DIRS index_POS.html 2>/dev/null | wc -l)
if [ "$n" -gt 0 ]; then
  echo "REVIEW  $n sink(s). Each one that uses dynamic data must be escaped or replaced with textContent:"
  grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|dangerouslySetInnerHTML" $EXCL $SRC_DIRS index_POS.html 2>/dev/null | cut -c1-120 | head -15 | sed 's/^/  /'
else echo "OK"; fi
if grep -qE "onclick=\"[A-Za-z]+\('\\$\{" index_POS.html 2>/dev/null; then echo "REVIEW  inline onclick with interpolated data in index_POS.html"; fi

section "5. Secrets and hard-coded fallbacks"
hits=$(grep -rInE "AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|script\.google\.com/macros/s/[A-Za-z0-9_-]{20,}" $EXCL . 2>/dev/null | cut -c1-110)
[ -n "$hits" ] && { echo "FAIL possible secret:"; echo "$hits" | sed 's/^/  /'; fail=1; } || echo "OK (no key patterns)"
fb=$(grep -nE "(PEPPER|SECRET|SALT|KEY|CODE)[A-Za-z_]*[^;]*\|\|[[:space:]]*['\"][A-Za-z0-9_-]{8,}['\"]" $GS_FILES 2>/dev/null | cut -c1-120)
[ -n "$fb" ] && { echo "FAIL hard-coded fallback secret:"; echo "$fb" | sed 's/^/  /'; fail=1; }

section "6. Saves that are not awaited (src, excluding backups)"
if [ -d src ]; then
  un=$(grep -rnE "^\s*(save|saveAll)[A-Za-z]*\(" $EXCL src 2>/dev/null | grep -vE "await|return|\.then" | wc -l)
  aw=$(grep -rnE "await (save|saveAll)[A-Za-z]*\(" $EXCL src 2>/dev/null | wc -l)
  echo "REVIEW  un-awaited: $un   awaited: $aw   (target for un-awaited: 0)"
fi

section "7. Sensitive data in browser storage"
st=$(grep -rnE "(localStorage|sessionStorage)\.setItem\([^)]*(pin|password|hash|users|token)" -i $EXCL src index_POS.html 2>/dev/null | cut -c1-120)
if [ -n "$st" ]; then echo "REVIEW  only the session token may be stored:"; echo "$st" | sed 's/^/  /'; else echo "OK"; fi

section "8. Magic numbers and hard-coded locale (informational)"
echo "REVIEW  '12000' fallbacks : $(grep -rn "12000" $EXCL src 2>/dev/null | wc -l)"
echo "REVIEW  hard-coded 0.11/0.12 tax : $(grep -rnE "\* *0\.1[12]\b" $EXCL src 2>/dev/null | wc -l)"
echo "INFO    'id-ID' : $(grep -rn "id-ID" $EXCL src 2>/dev/null | wc -l)   literal \"Rp \" : $(grep -rn "Rp " $EXCL src 2>/dev/null | wc -l)   toISOString() : $(grep -rn "toISOString()" $EXCL src 2>/dev/null | wc -l)"

section "9. Stale build artifact"
if [ -f index_ERP_GAS.html ] && [ -d src ]; then
  newest=$(find src -type f -newer index_ERP_GAS.html 2>/dev/null | head -1)
  [ -n "$newest" ] && echo "REVIEW  index_ERP_GAS.html is older than source ($newest). Paste dist/index.html into Apps Script instead, or regenerate." || echo "OK"
else echo "n/a"; fi

section "10. Leftover junk in repo root"
junk=$(ls 2>/dev/null | grep -E "\.cjs$|^temp|^patch\.js|app_diff|err\.log|recover_reports|_backup\.gs" | tr '\n' ' ')
[ -d src_backup ] && junk="$junk src_backup/"
[ -n "$junk" ] && echo "REVIEW  $junk (delete only if the PRD lists it and the owner approved)" || echo "OK"

printf '\n'
if [ $fail -ne 0 ]; then echo "RESULT: FAIL (fix the FAIL lines above)"; exit 1; fi
echo "RESULT: no hard failures. Resolve or justify every REVIEW line in the report."
