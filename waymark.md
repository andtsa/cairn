# cairn

A tool and a file format for drawing **zoomable, hand-authored maps of
codebases**. You describe the conceptual parts of a project (systems, modules,
files, symbols) as nested nodes in `cairn.yaml`, connect them with annotated
edges, and cairn serves an interactive graph you can pan, zoom, expand and read
source from. It exists to onboard people and agents onto large, unfamiliar
codebases: the map shows the structure someone holds in their head, not the
directory tree.

## Shape
- **Rust backend** (`cairn-server/`): an axum server and CLI. Parses and
  composes the map (following `include:` mounts), serves it as JSON, reads
  source files, and persists edits to the intent and state files.
- **Web frontend** (`static/`): vanilla JS + D3 single-page app with two
  layout engines (d3-force and WebCola), level-of-detail expand/collapse, a
  code panel, and a config panel.
- **The map files**: `cairn.yaml` (human intent, committed),
  `cairn.state.yaml` (pins, app-owned), `.cairn.config.yaml` (personal
  settings), and `waymark.md` summaries like this one.
- **Authoring skill** (`skills/cairn-build/`): a Claude Code skill that
  teaches an agent to write maps and waymarks, with the full schema reference.

## Entry points
- build: `cargo build` produces `target/debug/cairn`
- run: `cairn serve` in a directory with a `cairn.yaml`, then open
  `http://localhost:7777`. Press `?` in the browser for keys and help.
- validate: `cairn check --path cairn.yaml`
- test: `cargo test`
- start reading at `cairn-server/src/config.rs` (the format) and
  `static/app.js` (the frontend's wiring)

## Conventions
- The intent file stays sparse: anything derivable (levels, kinds, positions)
  is never written to it. Positions go to the state file.
- Included maps are read-only in the composed view.
- Saves are atomic (write to `.tmp`, then rename).

## Status
- Early and personal-use: the core map, includes, editing and both layout
  engines work. LSP-derived nodes are designed (see `plans/`) but not built.
