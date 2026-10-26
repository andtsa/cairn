# cairn intent-file schema

The complete reference for `cairn.yaml`, the human-authored intent file.
This is the only file this skill writes. Two sibling files exist in a live
project but you never author them: `cairn.state.yaml` (app-owned, personal
positions — gitignored) and an LSP cache (machine-generated). Everything here
concerns the intent file only.

## Top-level shape

```yaml
project: { ... }     # project settings
nodes: { ... }       # nested map of nodes, keyed by id
edges: [ ... ]       # flat list of relationships
```

## `project`

| Field | Required | Meaning |
|-------|----------|---------|
| `root` | yes | Directory that `source:` paths are relative to. Usually `.` (the file sits at the project root). |
| `lsp` | no | Map of language → LSP command, e.g. `{ rust: rust-analyzer }`. Only relevant to later automated derivation; safe to include or omit. |
| `depth_ceiling` | no | How deep automated tooling should auto-derive nodes *below* your authored nodes. Not a limit on how deep you author. Defaults to a conservative 2 when absent. |

## Nodes

Nodes are a **nested map keyed by a human-chosen id**. The id is the map key
(e.g. `backend:`), must be unique across the whole file — not just among its
siblings — and is what edges reference. Children nest under a `children:` key.
A repeated id is an error in `cairn check`; at load time the first
definition wins and later ones are dropped. (Ids in an `include:`d file are
namespaced under their mount, so they only need to be unique within that file.)

| Field | Required | Meaning |
|-------|----------|---------|
| `label` | recommended | Display name. If omitted, the id is used. Always give authored nodes a real label — that's the human-readable name on the map. |
| `description` | no | Longer prose shown on hover (or as an inline caption, per viewer preference) — see Descriptions below. |
| `source` | no | Binding to code: a directory (`src/auth/`), a file (`src/auth/token.rs`), or a symbol (`token.rs::validate`). Omit for a purely conceptual grouping with no single code location. |
| `symbol` | no | Explicit symbol name within `source`, as an alternative to the `source: file::Name` shorthand — see Symbol nodes below. |
| `line` / `col` | no | 1-based line (and optional column) pinpointing the symbol within `source`. See Symbol nodes below. |
| `symbol_kind` | no | Refines a Symbol node's glyph/colour only — see Symbol nodes below. |
| `kind` | no | Visual style only: `concept` \| `dir` \| `file` \| `symbol`. **Inferred** from the binding shape (dir path → dir, file path → file, `::` or `symbol:` set → symbol, no source → concept). Only set it to override the inference. |
| `zone` | no | Soft layout anchor — see Zones below. Used mainly on top-level nodes to spread the map. |
| `pin` | no | Exact committed position `{ x, y }` (pixels). Hand-authored default; overridden by a personal state-file pin. Prefer `zone` for generated configs; use `pin` only when an exact position matters. |
| `derive_children` | no | Opt-in flag: later have LSP populate children below this node. Currently inert (no effect until the LSP layer exists). Default `false`. |
| `include` | no | Mount another `cairn.yaml` as this node's subtree (nested graphs) — see Includes below. Mutually exclusive with `children` (children are ignored when `include` is set). |
| `children` | no | Nested map of child nodes, same shape, recursively. |

**Never author these** — they are derived or machine-owned: `level` (comes from
nesting depth), `origin`, and any per-node runtime state.

### Node kinds (inference)

You rarely set `kind`; it's inferred:

| Binding | Inferred kind |
|---------|---------------|
| no `source` and no `symbol` | `concept` |
| `symbol` set, or `source` contains `::` | `symbol` |
| `source` ends with `/` | `dir` |
| otherwise (a file path) | `file` |

### Zones

`zone` is a screen-size-independent gravity well — a coarse anchor, not exact
coordinates. Valid values:

```
top-left     top      top-right
left        center       right
bottom-left  bottom  bottom-right
```

Use zones to spread top-level systems around the canvas so the initial map is
legible. Child nodes generally need no zone — the force simulation arranges them.

### Source bindings

- **Directory**: `source: src/routes/` (trailing slash signals a directory).
- **File**: `source: src/config.rs`.
- **Symbol**: see the dedicated section below — there are two equivalent ways to
  write one.

Paths are relative to `project.root`.

### Symbol nodes

A symbol node points at one named thing inside a file (a function, class,
type, …) rather than the whole file. There are two ways to write the binding,
and they're interchangeable:

```yaml
# Shorthand — symbol name appended to the file path after `::`
validate_fn: { label: Validate, source: src/auth/token.rs::validate }

# Equivalent, explicit form — same binding, split into separate fields
validate_fn: { label: Validate, source: src/auth/token.rs, symbol: validate }
```

Nested symbols (a method on a type, say) chain with `::` in either form:
`file.rs::Outer::Inner::method`, or `symbol: Outer::Inner::method`. The file
path always uses `/` and never contains `::`, so the boundary between path and
symbol is unambiguous. **If both the shorthand and an explicit `symbol:` are
given, the explicit `symbol:` wins.**

Two optional fields refine a symbol binding further:

- **`line` / `col`** — an exact 1-based location within the file. When present,
  `line` is the authoritative jump target: opening the node's source in the code
  panel scrolls straight to that line instead of searching the file text for the
  symbol's name. **Reach for `line` when the name alone isn't a reliable anchor**
  — an overloaded/overridden method, a common name like `new` or `run`, a private
  symbol, or anything a plain text search could match more than once. When a
  symbol name is unique in its file, the shorthand alone is enough — the code
  panel finds it by name.
- **`symbol_kind`** — labels *what kind* of symbol it is: `function`, `method`,
  `class`, `struct`, `interface`, `trait`, `enum`, `constant`, `variable`,
  `field`, `module`, `type`, `macro`, or any custom string. This is **purely
  cosmetic** — it colours the node's glyph on the map and has no effect on
  layout, reveal depth, or anything structural. Set it when you know the
  symbol's role and want the map to visually distinguish, say, classes from
  functions; skip it otherwise (it's optional, not inferred).

Symbol nodes are rarely worth hand-authoring wholesale — reserve them for a
*named concept* that genuinely maps to one specific symbol a developer would
want to jump straight to (an entry point, a key type, the one function that
implements a documented algorithm), not routine functions. A directory of
files becoming a directory node, and a file becoming a file node, covers the
vast majority of a map — symbol nodes are the exception, not the default depth.

One implementation detail worth knowing: on save, the config is always
re-serialized with `source` and `symbol` as **separate** fields (even if you
wrote the shorthand) — so don't rely on the exact shorthand string surviving a
round-trip verbatim. Both forms parse to the identical binding, so this has no
practical effect on you as the author.

### Descriptions (hover / inline detail)

Both nodes and edges take an optional `description:` — longer prose, distinct
from `label`/`annotation`, meant for the detail a newcomer wants but that
would clutter the always-visible map if shown by default:

```yaml
nodes:
  auth:
    label: Auth service
    description: Issues and validates session tokens; the only system allowed to read the credentials table.
    zone: left

edges:
  - from: auth
    to: db
    annotation: reads credentials
    description: Runs on every login; falls back to a 5s cache on DB timeout so auth degrades gracefully instead of hard-failing.
```

How it's shown is a **viewer preference, not something you author**: on a node,
`description` appears either as a tooltip after the pointer settles over the
node, or as a truncated one-line caption under the node at all times — whichever
display mode the person viewing the map has chosen. On an edge, `description`
is hover-tooltip only (edges have no inline-caption mode). Either way, write it
assuming it might be read in full, in a tooltip, by someone unfamiliar with the
code — that's the audience.

The distinction from the always-visible fields matters for what you write where:

- **`label`** — the name (`Auth service`).
- **`annotation`** — the short, always-visible relationship phrase on an edge
  (`reads credentials`) — keep this to a few words, it's rendered on the canvas.
- **`description`** — the paragraph you'd say next if someone asked "tell me
  more" — context, rationale, gotchas, what breaks and how. This is genuinely
  optional; a self-explanatory node/edge doesn't need one. Reach for it on the
  nodes and edges most central to onboarding (the top-level systems, and the
  edges between them), not uniformly on every node — a description on every
  leaf is just noise nobody will read.

#### Formatting

Descriptions support a deliberately small markdown subset:

| Syntax | Renders as |
|--------|------------|
| lines starting `- ` or `* ` | bullet list |
| lines starting `1. ` or `1) ` | numbered list (keeps its starting number) |
| a blank line | paragraph break |
| `` `code` `` | inline code |

Everything else is **literal text**: no bold/italics, links, headings, tables,
nested lists or HTML. So `*_agent.toml` or `*Reasoned:*` show exactly as
written, and HTML is displayed rather than interpreted. A line that isn't a list
item ends the list — there are no wrapped continuation lines, so keep each item
on one line. Backticks pair from the left; a backtick with no partner stays
literal.

**Lists need real line breaks, so write any description containing one as a
YAML literal block (`|-`).** A folded block (`>-`) joins lines with spaces, and
the list silently collapses into one line:

```yaml
  relay:
    label: Relay server
    description: |-
      Accepts device connections and fans traffic out to clients.

      - orders packets per device
      - replays the last snapshot to new subscribers
```

Single-paragraph prose doesn't need either: a plain one-line value or `>-` is
fine. In the inline-caption display mode, formatting is flattened to one line
(markers and backticks dropped, items joined with ` · `), so the first line
should still read well on its own.

### Includes (nested graphs)

A node with `include: <path>` **mounts another `cairn.yaml` as its subtree**,
so a big codebase can be split into per-subproject maps that a top-level file
stitches together (instead of one enormous file).

```yaml
nodes:
  auth:
    label: Auth service
    zone: left
    include: services/auth/cairn.yaml   # relative to THIS file's directory
```

Semantics:

- The included file is a **complete, self-contained** intent file (its own
  `project`, `nodes`, `edges`), authored as if that subproject were the root.
- On load, its content is spliced under the mount: inner node ids are namespaced
  (`auth/<inner-id>`), inner root nodes become the mount's children, inner
  `source:` paths are rewritten to resolve from the outer root, and levels are
  offset. Inner content is **read-only** from the outer file — it's never written
  back into the outer config, so each map stays independently editable.
- **`include` and `children` are mutually exclusive.** If a node has both, the
  inline `children` are ignored (and `cairn check` reports it).
- `include` paths must not form a **cycle** (A includes B includes A) — that's a
  hard error.
- Inner ids are namespaced, so they only need to be unique within the inner
  file — two included maps can both have a `core` node.
- A mount node still takes `label`, `zone`, and `pin`. Give it a `zone` like any
  other top-level system.

You can author just the top-level composition file and leave the inner
`cairn.yaml` files for later (or for each subproject to own).

## Edges

A flat list. Each edge is a **semantic assertion between two node ids**.

| Field | Required | Meaning |
|-------|----------|---------|
| `from` | yes | Source node id (must exist in `nodes`). |
| `to` | yes | Target node id (must exist in `nodes`). |
| `annotation` | no | Short human label describing the *nature* of the relationship ("HTTP fetch API", "produces NodeGraph"). This is the value edges add — write it concretely. Always visible on the edge (when exposed), so keep it brief. |
| `description` | no | Optional longer prose about the relationship, shown as a hover-only tooltip on the edge (no inline caption for edges) — see Descriptions below. |
| `kind` | no | `import` \| `call` \| `reference` \| `semantic` \| any custom string. Defaults to `semantic` (the right default for hand-drawn edges). Only set it when the distinction adds signal. |
| `id` | no | Stable id. Auto-derived as `{from}__{to}` when omitted. Only set an explicit id if you have multiple parallel edges between the same pair and need to reference them reliably. |

Edges are drawn between whichever endpoints are visible at the current zoom
(they "morph" — a coarse edge between two systems resolves to finer endpoints as
you zoom in). You do not control per-zoom visibility; just assert the
relationship once at the natural level.

Edge count also decides how the map reads. When the drawn edges outnumber half
the visible nodes (the default ratio; each viewer can change it), the map counts
as *dense*: every edge is faded and its
annotation hidden until the viewer focuses a node (Alt+click) to reveal that
node's connections. Only a sparse map shows all annotations at once. That's one
more reason to author few, meaningful edges — each extra one makes it likelier
that nothing is readable without focusing.

## Compact authoring style

- Leaf nodes read well as inline maps: `save: { label: Save, source: .../save.rs }`.
- Nodes with children use block style.
- Edges as inline maps: `- { from: a, to: b, annotation: ... }`.
- Quote annotations that contain a leading `:` or other YAML-ambiguous text.

## Full example

```yaml
project:
  root: .
  lsp: { rust: rust-analyzer }
  depth_ceiling: 2

nodes:
  frontend:
    label: Web frontend
    description: Vanilla JS + D3 single-page app — renders the graph and drives all interaction.
    source: static/
    zone: right
    children:
      app:   { label: App entry, source: static/app.js }
      state: { label: State, source: static/state.js }
      api:   { label: API client, source: static/api.js }

  backend:
    label: Rust backend
    description: Axum server — parses the config, serves the graph, and persists edits back to disk.
    source: server/
    zone: left
    children:
      routes:
        label: Route handlers
        source: server/src/routes/
        derive_children: true          # let LSP fill in individual handlers later
      config: { label: Config parser, source: server/src/config.rs }
      types:  { label: Graph types, source: server/src/graph.rs }

  store:
    label: YAML store
    source: cairn.yaml
    zone: bottom

edges:
  - { from: frontend, to: backend, annotation: HTTP fetch API }
  - { from: backend, to: store, annotation: atomic read/write, description: "Writes only pins that deviate from the checked-in default, so the diff stays small." }
  - { from: config, to: types, annotation: produces NodeGraph }
  - { from: routes, to: types, annotation: mutates graph }
  - { from: app, to: api, annotation: fetch wrappers }
  - { from: app, to: state, annotation: shared mutable state }
```

## CLI

cairn is a single binary with two subcommands:

| Command | What it does |
|---------|--------------|
| `cairn serve --path <file> [--port <n>] [--host <addr>]` | Serve the interactive map on a local web server (default `127.0.0.1:7777`). A browser refresh re-reads the map from disk, so edits and new includes show up without a restart (unless the UI has unsaved edits). |
| `cairn check --path <file>` | Validate the config: that it parses, every `include:` resolves without a cycle, and every `source:` link exists on disk. Broken links → warnings; parse/read failures, include cycles, `include`+`children`, duplicate node ids, and parent cycles → errors (non-zero exit). Validates the whole *composed* graph, following includes. |

`--path` defaults to `cairn.yaml`. Use `check` as the authoritative validator
after authoring a config.

The server has no authentication — anyone who can reach it can edit the map. It
binds to loopback by default; don't suggest `--host 0.0.0.0` to expose a map on a
network. Put a reverse proxy with auth in front instead.
