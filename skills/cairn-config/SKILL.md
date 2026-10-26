---
name: cairn-config
description: >-
  Generate an initial cairn.yaml intent config that maps a codebase into a
  semantic, zoomable node/edge graph (systems → modules → files, with annotated
  relationships). Use this whenever the user wants to bootstrap, author, scaffold,
  or "seed" a cairn map/config for a project — including phrasings like "map
  this repo with cairn", "create a cairn.yaml", "set up cairn here",
  "document this codebase as a graph", or pointing cairn at a new (possibly
  large) project. Trigger it even when the user describes the outcome without
  naming the file, as long as they want a cairn config produced.
---

# cairn config author

## What cairn is (context you need)

cairn is a tool for building a **semantic, zoomable map of a codebase**:
**nodes** are logical components at different levels of abstraction, connected by
**annotated edges** (arrows with human-written labels). Zooming in reveals a
node's children. The map is not the file tree — it is the *conceptual* structure
a developer holds in their head, bound to real source paths.

The config you produce (`cairn.yaml`, the "intent file") captures **human
intent**: named groupings, labels, source bindings, and relationships. It is
deliberately sparse — anything a machine can derive (nesting level, exact
positions, per-file detail) is *not* authored by hand.

Your job: explore a codebase and write a first-draft intent file that a developer
would recognize as a faithful, navigable map — then hand it to them to refine in
the UI.

## Guiding principle: a readable onboarding map, not a file tree

The whole point of a cairn map is to **help someone find their way through a
large, unfamiliar codebase** — to onboard them. It is emphatically **not** a 1:1
depiction of the directory tree. Two facts shape everything you author:

**The layout gets cluttered past a handful of siblings.** Only so many nodes (and
edges) can share one level — the same parent / sibling group — before the view
becomes an unreadable hairball. So keep each group small — aim for **~5–9 siblings**,
rarely more — and go *deeper* with nesting rather than *wider* with many siblings.
A node that would have 20 children is a signal to introduce an intermediate
grouping layer, not to list all 20.

**Structure for understanding, not for fidelity.** Concretely:

- **Group by logical / semantic role, not by folder.** Pull related pieces under
  one named concept even if they live in different directories; split an
  over-large directory into several meaningful groups. The grouping is the value
  a machine can't provide. In a well-structured codebase, it could very well be 
  that the directory structure perfectly encapsulates the conceptual divide; and
  in such a case, splitting otherwise would likely be confusing. But after all,
  you may encounter all sorts of codebases of very varying quality. As such, be 
  mindful to base the grouping decisions on explanatory effectiveness.
- **High-level semantic containers, connected by few and descriptive edges.** At
  the top, a newcomer should see a handful of named systems and a *small* number
  of edges that explain how they relate ("HTTP fetch API", "reads user records") —
  not every import.
- **Add nesting layers where they earn their keep** — enough that the map reads
  cleanly as a high-level overview *and* reveals meaningful low-level detail as
  you zoom in. Go deep where a subsystem is genuinely rich, shallow where it isn't.
- **For very large, multi-subproject codebases, split into multiple intent files**
  and `include:` them from an outer file (see step 4), so each subproject reads as
  its own self-contained map and the top level stays a clean overview.

The test for any node or edge: *would this help a new engineer find their way, or
is it just mirroring the file system?* Author the former.

## References

- `references/schema.md` — complete field-by-field schema spec.
- `references/example.yaml` — a full, real-world intent file (cairn's own
  map). Read it to calibrate *granularity and style*: how coarse to go, how to
  phrase edge annotations, how to lay out the top level. Model the shape on it;
  don't copy its contents.

## The schema in one screen

Read `references/schema.md` for the complete field-by-field spec. The essentials:

```yaml
project:
  root: .                    # paths are relative to this
  depth_ceiling: 2           # optional; how deep LSP later auto-derives

nodes:                       # nested map keyed by human-chosen id
  backend:
    label: Rust backend      # display name
    description: Parses config, serves the graph, persists edits.  # optional — shown on hover
    source: server/          # binding: dir/ , file , or file::symbol
    zone: left               # optional layout anchor (see Layout below)
    children:
      routes:
        label: HTTP routes
        source: server/src/routes/
        children:
          save: { label: Save, source: server/src/routes/save.rs }

edges:                       # flat list of relationships
  - { from: frontend, to: backend, annotation: HTTP fetch API }
  - { from: routes, to: graph_types, annotation: mutates graph }
```

Deliberately **absent** (do not author these — they are derived or personal):
`level` (comes from nesting depth), `origin`, exact pixel positions for most
nodes, and per-edge visibility. Node `kind` (concept/dir/file/symbol) is inferred
from the binding (a `source: file::Name` shorthand or an explicit `symbol:`
field both count), so only set it to override. Give every authored node a
`label`.

A node can also **`include:` another `cairn.yaml`** to mount it as a subtree
— the key to keeping *large / multi-package* repos maintainable (see step 4).

## Methodology

Work top-down and breadth-first. You are drawing the *architecture*, not
transcribing the file tree.

### 1. Understand the repo before naming anything

Cheaply build a mental model first — don't read every file:

- **Build/manifest files** reveal the real decomposition: `Cargo.toml`
  (workspaces/crates), `package.json` (workspaces, deps), `go.mod`,
  `pyproject.toml`, `pom.xml`, `Makefile`. These name the top-level units better
  than the raw directory tree.
- **README / docs / ARCHITECTURE.md** often state the intended structure in
  words — mine them for system names and relationships.
- **Directory tree** (2–3 levels) and **entry points** (`main.*`, `index.*`,
  `lib.*`, `app.*`, server bootstraps) show where things start and how they group.

Prefer skimming indexes, module roots, and public interfaces over reading
implementations. You want the shape, not the details.

### 2. Identify systems (top level)

The top-level nodes are the **major architectural pieces** — the things a
developer would name when asked "what are the parts of this system?" Typically
2–8: e.g. `frontend`, `backend`, `database`, `cli`, `shared-lib`, plus notable
data stores or config. In a monorepo these are often the packages/workspaces.
Bind each to its directory (`source: packages/api/`).

### 3. Identify modules under each system

Within each system, the level-1 nodes are its **significant modules** — the
subdirectories or key files that carry a distinct responsibility. Bind to a
directory when it's a cohesive unit (`source: src/auth/`), or to a single file
when one file *is* the module (`source: src/config.rs`).

**Verify every `source:` path exists on disk before binding it.** Docs and
READMEs drift — a path a README mentions (e.g. `src/bin/cli/main.rs`) may have
moved or been renamed. Confirm the file/dir is actually there (a quick `ls` or
glob) rather than trusting prose; bind to what exists. The validator flags missing
sources as warnings, but catching them while authoring saves a round-trip.

### 4. Choose depth deliberately — especially for large repos

This is the most important judgment call. **Do not enumerate every file, class,
or function.** A directory of 50 files becomes *one* module node bound to the
directory — not 50 nodes. Stop at the granularity a developer actually navigates
by, which is almost always **directory / module / occasionally key-file** — not
individual symbols.

Rules of thumb:
- **Keep each sibling group small (~5–9 nodes).** This is the hard constraint —
  the layout clutters past a handful of nodes/edges at one level (see the Guiding
  Principle). If a group would exceed it, introduce an intermediate grouping node
  and nest, rather than piling siblings.
- Author **2–3 levels** for most repos. Go deeper only in a branch that genuinely
  has meaningful named sub-structure a person would want to see.
- Target a **total node count in the low tens** for a first draft (roughly
  10–40), even for a huge repo. Breadth and good labels beat exhaustive depth.
- **In a large monorepo, the top level alone can fill much of your budget.** A
  10-package workspace already has ~10 systems before any modules — so keep
  modules *shallow* there (3–5 per system, key files only), and let small
  packages be bare system nodes with no children rather than padding them out.
- Set `depth_ceiling` to signal how far automated tooling should later fill in
  detail below your authored nodes (2 is a sensible default).
- When a system is large but you don't want to hand-expand it, author the system
  node and its top modules, and leave the rest — the map stays legible and can be
  deepened later in the UI.

Symbol-level nodes (`file.rs::Type::method`) are rarely worth hand-authoring;
reserve them for a *named concept* that maps to one symbol, not routine
functions. When you do author one and the symbol name alone is ambiguous (an
overloaded method, a common name, a private symbol), add `line:`/`col:` to pin
an exact location rather than relying on a text search finding the right match
— see **Symbol nodes** in `references/schema.md` for the full field set
(`symbol`, `line`, `col`, `symbol_kind`) and how they interact.

**For a large monorepo or multi-repo, prefer *composition* over one giant file.**
A node can mount another self-contained `cairn.yaml` as its subtree:

```yaml
nodes:
  auth:
    label: Auth service
    zone: left
    include: services/auth/cairn.yaml   # path relative to THIS file
```

The included file is a complete map with its own `project`, `nodes`, and `edges`,
authored as if that subproject were the root — its nodes are spliced under the
mount (ids namespaced, sources rewritten, inner content read-only from the outer
file). This lets each package/service own its own map and a top-level file stitch
them together — far more scalable than one enormous file, and each piece stays
independently editable. Reach for it when the repo has natural sub-projects
(workspace members, services, packages): give each a node with `include:` plus a
`label` and `zone`. **Don't also give a mount node `children`** — they're ignored
when `include` is set (and `check` flags it). `include` paths must not form a
cycle. You can author just the top-level composition file and leave the inner
files for later (or for each subproject's owner to author).

A composed map is served as one: a viewer can hover any node and press `Enter`
to "go into" it — everything outside its subtree is hidden, like `cd` — so an
umbrella map over many subprojects doesn't need a separate server per
subproject. That makes navigation of a big map easier, but it does **not** relax
the sibling-group limit above: each level still has to read cleanly on its own.

### 5. Author edges (relationships)

Edges are the payoff — they encode how parts relate, which the file tree can't
show. For each meaningful relationship, add `{ from, to, annotation }`:

- **Find real dependencies**: imports/`use`/`require` between the components you
  bound, calls across system boundaries, data flow (who reads/writes a store),
  who owns/produces a shared type.
- **Annotate with the *nature* of the relationship**, briefly and concretely:
  "HTTP fetch API", "parses on startup", "reads user records", "produces
  NodeGraph". Not "depends on".
- **Prefer architectural edges over exhaustive ones.** A dozen well-chosen edges
  that explain the system beat a hundred mechanical imports. Edges between
  top-level systems and between sibling modules within a system are the most
  valuable; skip trivial ones.
- `from`/`to` are node ids. `id` is optional (auto-derived); `kind` defaults to
  `semantic` — only set it (`import`/`call`/`reference`) if the distinction adds
  signal.

### 5b. Add descriptions where they earn their keep

Both nodes and edges take an optional `description:` — longer prose shown on
hover, distinct from the always-visible `label`/`annotation` (full field
details in `references/schema.md`, "Descriptions"). This is a direct extension
of the Guiding Principle: the map's job is onboarding, and a description is
where you put the context a newcomer actually needs but that would clutter the
canvas if shown by default — what a system is for, why an edge exists, a
gotcha worth flagging.

Use it selectively, not everywhere:

- **Top-level systems almost always benefit** — a sentence on what the system
  does and why it exists is exactly what someone opening the map for the first
  time wants.
- **Edges between systems benefit when the `annotation` alone doesn't carry the
  full story** — e.g. an edge with a fallback/degradation behavior, a
  surprising direction, or a rate/frequency worth knowing.
- **Leaf nodes and self-explanatory modules usually don't need one.** A
  description on every node is noise nobody will read — reserve it for the
  handful of places a real explanation adds value.

Descriptions support a **small markdown subset**: `- ` bullet lists, `1. `
numbered lists, blank-line paragraphs, and `` `inline code` `` — nothing else
(no emphasis, links, headings or nesting; those show as literal text). Lists
need real line breaks, so a description containing one **must** be a YAML
literal block (`description: |-`). A folded block (`>-`) joins lines with
spaces and silently turns a list into `Handles: - a - b`. Plain one-paragraph
prose can stay a single line or `>-`. See `references/schema.md`, "Formatting".

### 6. Layout the top level

A generated map should open *legible*, not as a pile in one corner. Give each
**top-level (system) node a `zone`** so they spread across the canvas. Zones are
screen-size-independent anchors — prefer them over exact pixel `pin`s for a
generated config:

`top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`,
`bottom`, `bottom-right`.

Distribute systems around the canvas by their relationship (e.g. put a frontend
and backend on opposite sides with the datastore between/below). **With more
systems than the nine zones, that's fine** — zones are soft gravity wells, not
slots, so two systems sharing a zone just settle near each other and the force
simulation separates them. Group *related* systems into the same zone
deliberately (e.g. all client libraries `bottom`), and reserve exact `pin`s only
for the rare node whose precise position really matters. Child nodes need
no layout — the force simulation arranges them within their parent. Only use an
exact `pin: { x, y }` when a specific pixel position genuinely matters.

### 7. Validate before finishing

cairn ships its own validator — use it first:

```bash
cairn check --path <path-to>/cairn.yaml
```

`check` confirms the config parses, every `include:` resolves (no cycles), and
every `source:` link exists on disk. Broken links are warnings; these are errors
(non-zero exit):

- `include` + `children` on the same node
- **duplicate node ids** within one file — ids are global across the file, not
  per parent, so reusing a key under a different parent is a duplicate too.
  The first definition wins and the rest are dropped, so fix it rather than
  relying on which one survives.
- a **parent cycle** (a node ending up as its own ancestor)

It validates the whole *composed* graph (following `include` mounts). Fix
everything it reports.

If the `cairn` binary isn't on `PATH`, fall back to the bundled Python
validator. It additionally catches **dangling edge endpoints** (which `check`
doesn't yet) and invalid `zone` / `kind` / `pin` values:

```bash
python3 <skill-dir>/scripts/validate_config.py <path-to>/cairn.yaml
```

(Needs **PyYAML** — try `python` if `python3` lacks it, or `pip install pyyaml`.
It validates a *single* file and does **not** follow `include:` mounts, so run it
on each file, or prefer `cairn check` when available.)

Either way, the most common error is a dangling edge (`from`/`to` referencing a
node id that doesn't exist) — usually a typo or a renamed node. Fix all findings
before finishing.

## Output

Write `cairn.yaml` at the **project root** (the directory the map describes),
using `root: .`. Keep it hand-authored and clean:

- Nested `nodes:` map, flat `edges:` list.
- Every authored node has a `label`; bind `source:` wherever a node corresponds to
  real code (a pure conceptual grouping may omit `source`).
- Use compact inline maps for leaf nodes (`{ label: ..., source: ... }`) and block
  style for nodes with children — it reads well and diffs cleanly.
- Do **not** create the `cairn.state.yaml` file — positions are personal and
  the app generates it. Your zones live in the intent file.

Then tell the user what you mapped (systems, rough node/edge counts, notable
groupings you inferred) and invite them to refine labels, groupings, and layout in
the UI — the generated file is a starting draft of *their* conceptual model, not a
final answer. They can open it with `cairn serve --path cairn.yaml`
(defaults to `127.0.0.1:7777`). If a server for the map is already running, a
browser refresh picks up edits to the file — including newly `include:`d maps —
with no restart, unless the viewer has unsaved edits in the UI.

## Worked example (small)

For a repo with a Rust backend serving a JS frontend that reads/writes a YAML file:

```yaml
project:
  root: .
  depth_ceiling: 2

nodes:
  frontend:
    label: Web frontend
    source: static/
    zone: right
    children:
      app:  { label: App entry, source: static/app.js }
      api:  { label: API client, source: static/api.js }
  backend:
    label: Rust backend
    source: server/
    zone: left
    children:
      routes: { label: HTTP routes, source: server/src/routes/ }
      config: { label: Config parser, source: server/src/config.rs }
  store:
    label: YAML store
    source: data.yaml
    zone: bottom

edges:
  - { from: frontend, to: backend, annotation: HTTP fetch API }
  - { from: backend, to: store, annotation: atomic read/write }
  - { from: app, to: api, annotation: fetch wrappers }
  - { from: routes, to: config, annotation: reads settings }
```

Note the shape: three systems in distinct zones, a couple of modules each, edges
that explain how the pieces talk — and it stops there rather than listing every
file.
