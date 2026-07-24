# Shared GitHub Actions (RevealUIStudio)

Composite actions and reusable workflows for the fleet. Callers pin to an
**immutable commit SHA** (same rule as `backflow-reusable.yml`).

## promotion-gate (composite)

Enforces `test` → `main` promotion policy. Composite so required check context
stays exactly `promotion-gate`.

```yaml
jobs:
  promotion-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: RevealUIStudio/.github/.github/actions/promotion-gate@<pin-sha>
        with:
          head_ref: ${{ github.head_ref }}
          head_repo: ${{ github.event.pull_request.head.repo.full_name }}
          base_repo: ${{ github.repository }}
          head_sha: ${{ github.event.pull_request.head.sha }}
          base_ref: ${{ github.event.pull_request.base.ref }}
```

## check-client-leaks (composite)

Runs `scripts/check-client-leaks.sh` in the consumer repo. Keep job **name**
`Client / prospect name leak scan` on the caller (ruleset-required on some repos).

```yaml
jobs:
  scan:
    name: Client / prospect name leak scan
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: RevealUIStudio/.github/.github/actions/check-client-leaks@<pin-sha>
        with:
          # optional — only if the repo loads patterns from a secret
          client_leak_patterns: ${{ secrets.CLIENT_LEAK_PATTERNS }}
```

## issue-leak-scan (reusable workflow)

Scans issue/PR/comment bodies via gitleaks + `.gitleaks.issues.toml` on the
consumer default branch. Not a required status check → `workflow_call` is fine.

```yaml
name: Issue + PR Body Leak Scan
on:
  issues: { types: [opened, edited] }
  pull_request_target: { types: [opened, edited] }
  issue_comment: { types: [created, edited] }
permissions:
  issues: write
  pull-requests: write
  contents: read
concurrency:
  group: leak-scan-${{ github.event.issue.number || github.event.pull_request.number }}-${{ github.event.action }}
  cancel-in-progress: false
jobs:
  scan:
    uses: RevealUIStudio/.github/.github/workflows/issue-leak-scan-reusable.yml@<pin-sha>
    secrets: inherit
```
