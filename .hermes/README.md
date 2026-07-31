# .hermes/ — Repository Engineering Standards

This directory contains **persistent engineering and documentation policies** for Kairo. Any human contributor or AI agent should read these files before making changes.

Standards live in the repository — not in agent memory — so behavior is reproducible across sessions and tools.

## Files

| File | Purpose | Audience |
|------|---------|----------|
| [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) | Required documentation structure and quality bar | Authors, reviewers, agents |
| [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md) | Workflow, quality gates, and repo-specific rules | Contributors |
| [ARCHITECTURE_PRINCIPLES.md](ARCHITECTURE_PRINCIPLES.md) | Design principles and architectural invariants | Architects, senior engineers |

## Relationship to root-level docs

| `.hermes/` policy | Root-level doc |
|-------------------|----------------|
| DOCUMENTATION_STANDARD.md | Governs [README.md](../README.md), [TECHNICAL.md](../TECHNICAL.md), etc. |
| ARCHITECTURE_PRINCIPLES.md | Complements [ARCHITECTURE.md](../ARCHITECTURE.md) |
| PROJECT_STANDARDS.md | Complements [CONTRIBUTING.md](../CONTRIBUTING.md) |

## Product constitution

Kairo-specific product rules (emotional timeline hierarchy, UX non-negotiables, agent profiles) live in **[docs/AGENTS.md](../docs/AGENTS.md)**. Treat that file as the product constitution; `.hermes/` governs engineering process and documentation.

## When to update

- **PROJECT_STANDARDS.md** — when quality gates, tooling, or workflow changes
- **ARCHITECTURE_PRINCIPLES.md** — when core design invariants change
- **Root docs** (README, TECHNICAL, ARCHITECTURE) — whenever implementation changes meaningfully
