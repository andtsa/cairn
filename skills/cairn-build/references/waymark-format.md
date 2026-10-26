# The waymark format (`waymark.md`)

A **waymark** is a codebase's one-file summary: the answer to *"what is this
codebase about?"* that a person or agent can read in a minute. It complements the
cairn map. The map (`cairn.yaml`) is the in-depth graph of parts and how they
depend on each other. The waymark is the short prose summary you read before you
open the map.

## Where it lives

`waymark.md`, exactly that name, at the **root of the codebase it describes**.

A waymark stands on its own: it needs no map, and it is plain markdown that
anyone can read straight from the file. A repo with a waymark and no
`cairn.yaml` is perfectly normal.

When a cairn map *is* served, cairn finds waymarks automatically:

- **The map's own root**: `waymark.md` in the directory `project.root` resolves
  to (normally next to `cairn.yaml`). Opened from the HUD's *waymark* button.
- **An `include:` mount**: `waymark.md` at the root of the included map. The
  mount node gets the badge.
- **A directory binding**: any node with `source: some/dir/` whose directory
  contains a `waymark.md`. Putting a waymark in a directory is how you declare it
  a codebase in its own right, even without a separate map.

A waymark anywhere else is still valid; cairn just has no node to attach it to,
so it is read as a plain file.

A node with a waymark shows a ▲ badge. Click the badge, use right-click → *Read
waymark*, or hover and press `W` to read it. `cairn check` reports how many
waymarks it found.

## Kept in place, kept current

A waymark describes the codebase **as it is now**. Update it in place whenever a
change alters what it says, such as a new major part, a changed entry point, or a
retired subsystem. Rewrite the affected lines rather than appending, so it never
grows into a changelog. If a reader would be misled by the current text, it is
out of date.

## Shape

Aim for **under ~60 lines**, about one screen. Recommended outline:

```markdown
# <name>

One or two short paragraphs: what this is, who it's for, and why it exists.
Lead with the single sentence you'd say if you had only one.

## Shape
- **<part>** (`path/`): what it's responsible for. 3–7 bullets mirroring the
  map's top-level systems, not the directory tree.

## Entry points
- how to build / run / test (exact commands)
- where to start reading (one or two files)

## Conventions
- non-obvious rules or gotchas a newcomer would trip over (optional)

## Status
- maturity, what's in flight, known gaps: current state only (optional)
```

Headings beyond these are fine when the codebase needs them. Keep the order:
identity first, then shape, then how to get going.

## What doesn't belong

- **File-by-file listings or dependency detail.** That is the map's job; link
  to it by mentioning `cairn.yaml` instead.
- **API reference, tutorials, design rationale.** Point to the docs that hold them.
- **History** ("we used to…", dated changelog entries) and long TODO lists.

## Formatting cairn renders

The popup renders a markdown subset: `#` headings, paragraphs (wrapped lines
reflow), `- ` / `1. ` lists (indent a line to continue the previous item),
`` `inline code` ``, `**bold**`, and ``` fenced code blocks. Links, italics,
tables, images and nested lists show as literal text. Refer to paths in
backticks instead of linking them.
