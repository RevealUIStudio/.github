# Shared GitHub Actions (RevealUIStudio)

Composite actions and reusable workflows for the fleet. Callers pin to an
**immutable commit SHA** (same rule as `backflow-reusable.yml`).

## promotion-gate

Enforces `test` → `main` promotion policy (head branch, same-repo origin,
merge-commit ancestry).

**Why a composite action (not a reusable workflow):** repository rulesets
require the check context name `promotion-gate`. A `workflow_call` job would
surface as `promotion-gate / <job-id>` and break those rulesets without a
settings migration. Composite keeps the job id in each caller.

### Caller (thin)

```yaml
name: promotion-gate
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
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

Bump the pin via Dependabot `github-actions` or a deliberate fleet PR.
