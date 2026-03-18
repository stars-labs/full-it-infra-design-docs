# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Docusaurus 3.9 documentation site for Stars Labs enterprise IT infrastructure design. Content is written in Chinese (Simplified) covering identity auth (Casdoor), device management (Fleet), automation, ERP integration (Odoo), network architecture, storage, security, and backup solutions.

## Commands

- `npm start` — Dev server with hot reload
- `npm run build` — Production build (outputs to `build/`)
- `npm run serve` — Serve production build locally
- `npm run typecheck` — TypeScript type checking (`tsc`)
- `npm run clear` — Clear Docusaurus cache (`.docusaurus/`)

## Architecture

- **Docusaurus 3.9** with `@docusaurus/preset-classic`, TypeScript config
- **Mermaid** enabled via `@docusaurus/theme-mermaid` — diagrams render in markdown using ` ```mermaid ` fenced code blocks
- **Sidebar** auto-generated from `docs/` folder structure (controlled by `sidebar_position` frontmatter in each doc)
- **Deployment** targets GitHub Pages at `stars-labs.github.io/full-it-infra-design-docs/`
- **Future v4 flag** enabled in `docusaurus.config.ts`

## Key Files

- `docusaurus.config.ts` — Site config (title, URL, navbar, footer, mermaid theme, prism themes)
- `sidebars.ts` — Sidebar definition (currently auto-generated from docs directory)
- `src/pages/index.tsx` — Homepage component
- `src/css/custom.css` — Global CSS overrides
- `docs/` — All documentation markdown files

## Writing Docs

- Each doc uses YAML frontmatter with `sidebar_position` to control ordering
- Mermaid diagrams are used extensively for architecture/topology/flow diagrams — validate syntax carefully as `onBrokenLinks: 'throw'` is set
- Content language is Chinese (Simplified); keep new docs consistent
- No blog plugin is configured — docs-only site
