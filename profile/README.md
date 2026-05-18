# RevealUI Studio

**RevealUI Studio builds the open-source runtime that ships the business logic every software product needs — and implements it for customers who'd rather hire someone who built it than build it themselves.**

Three things, in three places.

## The Platform · [revealui.com](https://revealui.com)

[**RevealUI**](https://github.com/RevealUIStudio/revealui) is an open-source TypeScript runtime that ships five business primitives: **Users** (auth, RBAC/ABAC, agent identity), **Content** (admin engine, collections, rich text), **Products** (catalog, pricing, license keys), **Payments** (Stripe live-mode billing with webhook reconciliation), and **Intelligence** (agent orchestration, open-model inference, RAG, MCP servers, tamper-evident audit chain). 26 packages on npm. Self-host on any infra. Install with `npx create-revealui@latest my-app`. Docs at [docs.revealui.com](https://docs.revealui.com).

Adjacent in the Platform bucket: [**RevDev**](https://github.com/RevealUIStudio/revdev) — native developer tools (Studio Tauri desktop + Console Go TUI + Harness daemon). Buildable, pre-1.0.

## Studio Services · [revealuistudio.com](https://revealuistudio.com)

Productized fixed-bid engagements on the Platform. Three tiers:

- **Fleet Stamp** — a branded customer-facing AI runtime in 30 days. Auth + RBAC/ABAC + Stripe billing + content management + agent layer + tamper-evident audit log, on your domain, in your cloud.
- **Custom Build** — bespoke 4–12 week build on RevealUI when a Fleet Stamp doesn't fit. Variants for greenfield and legacy-to-RevealUI migrations.
- **AI Integration** — productionize the customer's chosen inference provider (Claude, OpenAI, Llama, Ollama, or open-model) for 1–3 customer workloads with evals, gateway config, cost controls, audit integration, and a written model-selection ADR. Multi-model at the consulting layer, vendor-agnostic at the runtime layer.

Intake is a 30-minute discovery call. When a written assessment is needed before scoping, a paid Architecture Review SOW.

## Methodology + Open Tools · GitHub + [docs.revealui.com](https://docs.revealui.com)

Public-good tooling the studio uses on every engagement, open-sourced because the studio runs it daily and external developers find it useful. The methodology writings — ADRs, architecture decisions, the Fleet Stamp engagement explainer — live on [docs.revealui.com](https://docs.revealui.com).

### Open tools

- [**RevVault**](https://github.com/RevealUIStudio/revvault) — age-encrypted secret vault. Rust CLI + Tauri desktop app. 100% passage-compatible. The canonical secret store for the entire RevealUI Studio fleet.
- [**RevSkills**](https://github.com/RevealUIStudio/revskills) — Claude Code skills used in production at the studio: `next-best-practices`, `tailwind-v4`, `security-hardening`. Install via `npx skills add RevealUIStudio/revskills`. Listed on [agentskills.io](https://agentskills.io).
- [**RevKit**](https://github.com/RevealUIStudio/revkit) — portable WSL development environment toolkit. Bootstrap scripts + RevStation PowerShell module + boot optimization for WSL2 Ubuntu development.
- **RevForge methodology** — written explanation of how the 30-day Fleet Stamp engagement runs end-to-end. Documented on [docs.revealui.com](https://docs.revealui.com).

---

**REVEALUI STUDIO L.L.C.** · Tennessee · [founder@revealui.com](mailto:founder@revealui.com)

License posture: 24 of 26 packages are MIT forever. Two Pro packages (`@revealui/ai`, `@revealui/harnesses`) are Fair Source ([FSL-1.1-MIT](https://fsl.software/)) and convert to MIT 2 years after each release.
