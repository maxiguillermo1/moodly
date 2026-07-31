# Documentation Standard

Version: 1.0  
Applies to: every repository managed through Hermes SSD LLM  
Priority: required for all new and maintained repositories

---

## Objective

Every repository must be understandable by **two audiences**:

### Audience 1 — Beginners

Someone with almost no technical experience should understand within five minutes:

- What the project is
- Why it exists
- What problem it solves
- How to run it
- How to use it

### Audience 2 — Senior engineers

An experienced engineer should understand without reading source code:

- Architecture and component ownership
- Engineering tradeoffs and design decisions
- Deployment, scaling, and failure handling
- Performance characteristics and known limitations
- Future roadmap

Documentation is **part of the product**, not an afterthought.

---

## Quality bar

Documentation should feel comparable to:

- Apple Developer Documentation (clarity, approachability)
- The Rust Book (depth without condescension)
- Stripe Engineering / Cloudflare Docs (technical precision)
- Go Documentation (structure and completeness)

**Rules:**

- Use simple English. Explain every technical term on first use.
- Never assume the reader knows LLMs, Rust, SSDs, Apple Silicon, or inference.
- Never invent features. Document only what exists in the codebase.
- Keep documentation synchronized with implementation after meaningful changes.
- Prefer rewriting stale sections over patching around outdated structure.

---

## Required files

### PROJECT_MANIFEST.md (required)

Agent-optimized entry point. Unlike README (human-first), the manifest is concise and structured for coding agents:

- Project purpose, stack, and status in scannable tables
- Repository layout and key commands
- Architecture summary with pointers to ARCHITECTURE.md / TECHNICAL.md
- Config, data, and secrets locations
- Engineering standards (.hermes/, CONTRIBUTING.md)
- Testing and deployment workflows
- Explicit constraints agents must not violate
- Important files index

Use `.hermes/templates/PROJECT_MANIFEST_TEMPLATE.md` when bootstrapping a new repository.

### README.md (required)

Beginner-facing. Must follow this structure unless a different structure is objectively better for the project type:

```text
# Project Name
One-sentence summary.

## What is this?
## Why was it built?
## The problem
## The solution
## How it works
## Technologies used        (explain each technology in plain English)
## Hardware requirements    (if applicable)
## Software requirements
## Installation
## Usage
## Project structure        (explain every top-level folder)
## Examples
## FAQ
## Future roadmap
## License
```

**Technology explanations** — when listing a technology, immediately explain it:

> **Rust** — A programming language designed to be fast, reliable, and efficient with memory. Commonly used for operating systems, servers, and performance-critical software.

### TECHNICAL.md (required for non-trivial projects)

Senior-engineer reference. Must cover:

- System architecture and repository layout
- Component ownership and module responsibilities
- Lifecycle, data flow, and state flow
- Storage, configuration, logging, caching
- Concurrency, memory management, networking
- Performance, security, testing, deployment
- Failure handling, observability, benchmarking
- Design decisions with alternatives considered
- Known limitations and future improvements
- Architecture Decision Records (ADRs)
- Mermaid diagrams where they clarify flow

---

## Optional files (create only when they add value)

| File | When to create |
|------|----------------|
| ARCHITECTURE.md | Living component map that changes frequently |
| CONTRIBUTING.md | Open-source or multi-contributor projects |
| BENCHMARKS.md | Performance-sensitive projects with measured results |
| SECURITY.md | Projects handling auth, secrets, or user data |
| CHANGELOG.md | Released software with version history |
| MIGRATION.md | Breaking changes or rename history |
| API.md / CLI.md | Public APIs or command-line tools |
| ROADMAP.md | When roadmap is large enough to warrant separation |

Never create documentation files that duplicate content without adding distinct value.

---

## Repository audit process

Before writing or rewriting documentation for any repository:

1. **Understand purpose** — read README, issues, and top-level code
2. **Read the codebase** — identify entry points, modules, and data flow
3. **Determine architecture** — components, boundaries, dependencies
4. **Identify technologies** — languages, frameworks, databases, hardware
5. **Map workflows** — build, test, deploy, daily usage
6. **Find strengths and weaknesses** — what works well, what is fragile
7. **Rewrite to match reality** — never document planned features as if shipped

---

## Synchronization policy

Documentation must be updated when:

- A public API or CLI command changes
- Architecture or component boundaries change
- New dependencies or hardware requirements are added
- Benchmarks are re-run (update BENCHMARKS.md with measured numbers only)
- Security model or threat surface changes
- Breaking changes ship (CHANGELOG.md + MIGRATION.md if needed)

Agents and contributors should treat documentation updates as part of the same change as code — not a follow-up task.

---

## Agent behavior

When an AI agent works in a repository with `.hermes/`:

1. Read `.hermes/README.md` and relevant policy files before editing
2. Evaluate whether existing documentation matches the standard
3. If documentation is missing or incomplete, generate or improve it
4. Match the tone and structure defined here
5. Never append to stale documentation when a rewrite is clearer

This policy replaces reliance on persistent agent memory. Standards live in the repository.
