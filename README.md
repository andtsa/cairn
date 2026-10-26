
# cairn

previously known as "visual graph-tree" and "lookout"

## what is this

this is a tool and a format for creating interactive visualisations of (large) codebases.

*nodes* can be created to represent *components, modules, files, functions*, and other 
*symbols*; but can also represent *concepts, structures* and anything else you'd include in 
a project schematic (e.g. a C4 diagram).

```yaml
nodes:
  frontend:
    label: Web frontend
    source: static/
    description: Vanilla JS + D3 single-page app — renders the graph, drives interaction, and hosts the config panel.
    zone: top-right

  yaml_store:
    label: Intent map
    source: cairn.yaml
    description: The file that contains the actual graph, with all the nodes, labels, descriptions, and edges between them.
    zone: bottom

  backend:
    label: Rust backend
    source: cairn-server/
    description: An axum web server. it parses the intent map, serves the composed graph and file contents, and persists edits.
    zone: top-left
```

these nodes can have *semantic edges* between them, used to express the conceptual 
connection between the two nodes.

```yaml
edges:
  - from: frontend, 
    to: backend,    
    annotation: HTTP fetch API,
    description: "The frontend fetches /graph, /file, /config, /save and /reload over HTTP; the backend is the single source of truth for the composed graph." 
    
  - from: backend,  
    to: yaml_store, 
    annotation: parse + serialize 
```

the resulting graph is rendered on an interactive canvas in the browser, and can be panned,
zoomed, and dragged around. related files/symbols/directories may be viewed directly in a
panel in the browser

![screenshot of an example graph](docs/example-1.png)

### nesting

a module probably has submodules, and as such you can nest a whole graph within a node, 
and a graph in each sub-node, and so on:
```yaml
  backend:
    label: Rust backend
    source: cairn-server/
    description: An axum web server. it parses the intent map, serves the composed graph and file contents, and persists edits.
    zone: top-left
    children:
      config_parser:   { label: Config parser,   source: cairn-server/src/config.rs,          description: "Parses / serializes the intent YAML and composes nested includes." }
      graph_types:     { label: Graph types,     source: cairn-server/src/graph.rs,           description: "Runtime Node / Edge / NodeGraph types (symbol, description, pins, kinds)." }
      kinds:           { label: Kinds,           source: cairn-server/src/kinds.rs,           description: "NodeKind, EdgeKind, and SymbolKind enums." }
      state_file:      { label: State file,      source: cairn-server/src/state.rs,           description: "Loads / saves personal pins and dismissed items (nullable-pin tombstones)." }
      personal_config: { label: Personal config, source: cairn-server/src/personal_config.rs, description: "Reads / writes the per-project .cairn.config.yaml dotfile." }
      check_cli:       { label: Check CLI,       source: cairn-server/src/check.rs,           description: "The `cairn check` subcommand — validates a map without serving." }
      server_entry:    { label: Server entry,    source: cairn-server/src/main.rs,            description: "CLI, routing, state-file application, and static asset serving." }
      route_handlers:
        label: Route handlers
        source: cairn-server/src/routes/
        description: HTTP endpoints over the in-memory graph.
        children:
          save:         { label: Save,   source: cairn-server/src/routes/save.rs,   description: "Writes the intent + state files (only deviations go to state)." }
          graph:        { label: Graph,  source: cairn-server/src/routes/graph.rs,  description: "Serves the composed NodeGraph as JSON." }
          edge:         { label: Edge,   source: cairn-server/src/routes/edge.rs,   description: "Create / patch edges." }
          node:         { label: Node,   source: cairn-server/src/routes/node.rs,   description: "Create / patch / delete nodes (double-option pin patch)." }
          file:         { label: File,   source: cairn-server/src/routes/file.rs,   description: "Reads file contents (line range) and directory listings." }
          reload:       { label: Reload, source: cairn-server/src/routes/reload.rs, description: "Re-parses the intent + state files from disk." }
          config_route: { label: Config, source: cairn-server/src/routes/config.rs, description: "GET / PUT the personal config dotfile." }
```

### descriptions

node and edge descriptions support a small subset of markdown: `- ` bullet lists, `1. ` 
numbered lists, blank lines between paragraphs, and `` `inline code` ``. nothing else is 
interpreted (no emphasis, links, or nesting), so text like `*_agent.toml` shows as written.

lists need real line breaks, so use a YAML literal block (`|`) — a folded block (`>`) joins 
the lines into one:
```yaml
  relay:
    label: Relay server
    description: |-
      Accepts device connections and fans traffic out to clients.

      - orders packets per device
      - replays the last snapshot to new subscribers
```

### waymarks

a map is the in-depth view; a **waymark** is the short one. `waymark.md`, kept at the
root of a codebase, is an in-place, continuously updated, single-file summary of what
the codebase is: what it's for, its major parts, and where to start. it's meant to be
the first thing a person or agent reads, and to be edited (not appended to) whenever
the codebase changes in a way that makes it wrong.

cairn finds waymarks automatically, at the map's root (the *waymark* button in the
HUD), at the root of every `include:`d map, and in any directory a node binds to.
nodes with one get a ▲ badge: click it, or hover and press `W`. see
[this repo's waymark](waymark.md) and
[the format guide](skills/cairn-build/references/waymark-format.md).

## using this

to use this, you need 2 things:

1. the `cairn` binary, found under `target/debug/cairn` after `cargo build`
2. a `cairn.yaml` file, which you should make yourself! you can see the one for [this codebase](cairn.yaml) for inspiration.

from the directory containing the codebase (and likely the `cairn.yaml`), run
```sh
cairn serve
```

and open [localhost](http://localhost:7777) as instructed

in the browser, press `?` to open the documentation panel

### writing maps with claude code

[`skills/cairn-build`](skills/cairn-build) is a Claude Code skill that teaches
an agent to author `cairn.yaml` maps (the schema, how to group and nest, and how to
validate) and to write and refresh `waymark.md` summaries. it lives here so it changes together with the format it documents.

maps get written from other repositories, so install the skill as a personal skill (a
project skill would only load inside this repo). symlink it rather than copying, so a
`git pull` keeps it current:
```sh
ln -s "$PWD/skills/cairn-build" ~/.claude/skills/cairn-build
```
run that from the root of this repository, once per machine.


## and now?

contributions are more than welcome:)


