#!/usr/bin/env python3
"""Validate a vgraphtree intent file (vgraphtree.yaml).

Catches the authoring mistakes that are tedious to spot by eye: dangling edge
endpoints, duplicate node ids, missing/typo'd source paths, bad zones/pins.

Usage:
    python3 validate_config.py path/to/vgraphtree.yaml

Exit code 0 if there are no errors (warnings are allowed), 1 otherwise.
"""
import sys
import os

try:
    import yaml
except ImportError:
    sys.exit(
        "This validator needs PyYAML. Install it with:  pip install pyyaml\n"
        "(or run it in an environment that has it)."
    )

VALID_ZONES = {
    "top-left", "top", "top-right",
    "left", "center", "right",
    "bottom-left", "bottom", "bottom-right",
}
VALID_KINDS = {"concept", "dir", "file", "symbol"}

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def walk_nodes(nodes, parent, depth, ids, collected):
    """Recurse the nested node map, collecting ids and validating each node."""
    if not isinstance(nodes, dict):
        err(f"`nodes` under {parent or 'root'} must be a mapping, got {type(nodes).__name__}")
        return
    for nid, node in nodes.items():
        if nid in ids:
            err(f"duplicate node id '{nid}' (ids must be unique across the whole tree)")
        ids.add(nid)
        collected.append((nid, node, depth))
        if not isinstance(node, dict):
            err(f"node '{nid}' must be a mapping, got {type(node).__name__}")
            continue

        if "label" not in node:
            warn(f"node '{nid}' has no label — the id will be shown instead")

        zone = node.get("zone")
        if zone is not None and zone not in VALID_ZONES:
            err(f"node '{nid}' has invalid zone '{zone}' (valid: {', '.join(sorted(VALID_ZONES))})")

        kind = node.get("kind")
        if kind is not None and kind not in VALID_KINDS:
            err(f"node '{nid}' has invalid kind '{kind}' (valid: {', '.join(sorted(VALID_KINDS))})")

        pin = node.get("pin")
        if pin is not None:
            if not isinstance(pin, dict) or not isinstance(pin.get("x"), (int, float)) \
                    or not isinstance(pin.get("y"), (int, float)):
                err(f"node '{nid}' pin must be {{x: <number>, y: <number>}}, got {pin!r}")

        # A mount node (`include:`) delegates its subtree to another file; it must
        # not also declare inline children (vgraphtree ignores them). This single-
        # file validator does not follow the include — run `vgraphtree check` for
        # full composed-graph validation.
        if node.get("include") and node.get("children"):
            err(f"node '{nid}' has both `include` and `children` — children are ignored; remove them")

        children = node.get("children")
        if children is not None:
            walk_nodes(children, nid, depth + 1, ids, collected)


def source_path(source, root):
    """Resolve a binding to a filesystem path (strip a ::symbol suffix)."""
    file_part = source.split("::", 1)[0]
    return os.path.normpath(os.path.join(root, file_part))


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 validate_config.py path/to/vgraphtree.yaml")
    path = sys.argv[1]
    if not os.path.exists(path):
        sys.exit(f"File not found: {path}")

    with open(path) as f:
        try:
            cfg = yaml.safe_load(f)
        except yaml.YAMLError as e:
            sys.exit(f"YAML parse error: {e}")

    if not isinstance(cfg, dict):
        sys.exit("Top level must be a mapping with `project`, `nodes`, `edges`.")

    # project
    project = cfg.get("project")
    if not isinstance(project, dict) or "root" not in project:
        err("`project.root` is required")
        root = os.path.dirname(os.path.abspath(path))
    else:
        root = os.path.join(os.path.dirname(os.path.abspath(path)), project["root"])

    # nodes
    ids = set()
    collected = []  # (id, node, depth)
    walk_nodes(cfg.get("nodes", {}) or {}, None, 0, ids, collected)

    # source path existence (warn only — a binding may legitimately not exist yet)
    for nid, node, _ in collected:
        if isinstance(node, dict) and node.get("source"):
            p = source_path(node["source"], root)
            if not os.path.exists(p):
                warn(f"node '{nid}' source '{node['source']}' does not exist on disk ({p})")

    # edges
    edges = cfg.get("edges", []) or []
    if not isinstance(edges, list):
        err("`edges` must be a list")
        edges = []
    for i, e in enumerate(edges):
        if not isinstance(e, dict):
            err(f"edge #{i} must be a mapping, got {type(e).__name__}")
            continue
        for end in ("from", "to"):
            ref = e.get(end)
            if ref is None:
                err(f"edge #{i} missing `{end}`")
            elif ref not in ids:
                err(f"edge #{i} `{end}: {ref}` references a node id that does not exist")
        if e.get("from") == e.get("to") and e.get("from") is not None:
            warn(f"edge #{i} connects '{e.get('from')}' to itself")
        if not e.get("annotation"):
            warn(f"edge #{i} ({e.get('from')} → {e.get('to')}) has no annotation")

    # report
    max_depth = max((d for _, _, d in collected), default=0)
    print(f"nodes: {len(collected)}   edges: {len(edges)}   max authored depth: {max_depth}")
    for w in warnings:
        print(f"  warning: {w}")
    for e in errors:
        print(f"  ERROR:   {e}")

    if errors:
        print(f"\n{len(errors)} error(s), {len(warnings)} warning(s) — not valid.")
        sys.exit(1)
    print(f"\nvalid ✓  ({len(warnings)} warning(s))")
    sys.exit(0)


if __name__ == "__main__":
    main()
