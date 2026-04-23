# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stars Labs IT infrastructure design documentation, built with **Astro + Starlight**. Content is in Chinese (Simplified) covering identity auth (Casdoor), device management (Fleet), network architecture, storage, LLM inference cluster, security, and backup solutions.

Deployed to GitHub Pages at `https://stars-labs.github.io/full-it-infra-design-docs/`.

## Commands

- `npm run dev` (or `npm start`) — Dev server with hot reload
- `npm run build` — Production build (outputs to `dist/`)
- `npm run preview` — Preview production build locally
- `npm run typecheck` — TypeScript type checking

## Architecture

- **Astro + Starlight** — docs-only site, no blog
- **Mermaid**: ` ```mermaid ``` ` blocks converted by `plugins/remarkMermaid.js` to `<div class="mermaid">`, rendered client-side via mermaid.js CDN (theme: neutral/dark)
- **Sidebar**: configured in `astro.config.mjs` under `starlight({ sidebar: [...] })` with `autogenerate` per directory
- **Deployment**: GitHub Pages at `stars-labs.github.io/full-it-infra-design-docs/`

## Key Files

- `astro.config.mjs` — Site config (title, URL, sidebar, mermaid head script)
- `plugins/remarkMermaid.js` — Remark plugin for mermaid block conversion
- `src/styles/custom.css` — Starlight CSS custom properties
- `src/content/docs/` — All documentation (Starlight content collection)

## Content Structure

```
src/content/docs/
├── index.md               (landing page)
├── 01-core-design/        IT infrastructure design
├── 02-hardware/           Hardware selection (servers, NAS, LLM cluster, switches)
├── 03-architecture/       Network, security, storage, backup design
├── 04-governance/         Onboarding/offboarding process
├── 05-operations/         SLA, filesystem, SOE, forensics recovery
└── *.md                   Standalone docs
```

## Writing Docs

- Sidebar ordering: use `sidebar:\n  order: N` in frontmatter
- Mermaid diagrams: use ` ```mermaid ``` ` fenced code blocks — they render client-side
- Content language: Chinese (Simplified) — keep new docs consistent
- When adding docs to numbered directories, they're auto-included by `autogenerate`
