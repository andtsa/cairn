// ─── Description markdown ─────────────────────────────────────────────────────
// A deliberately tiny markdown subset for node / edge descriptions (and help
// prose):
//   - lines starting `- ` or `* ` → bullet list; `1. ` / `1) ` → numbered list
//   - a blank line → paragraph break
//   - `backtick` runs → inline code
// Everything else — emphasis, links, headings, nested lists — stays literal
// text, so globs like `*_agent.toml` can't be misread as markup. A line that
// isn't a list item ends the list (no continuation lines).
//
// Line breaks only survive in YAML literal blocks (`description: |`); folded
// blocks (`>-`) join lines with spaces, so they never contain lists.
//
// Output is built from DOM nodes, never innerHTML, so a description can't
// inject markup.
//
// Whole documents (waymarks) use renderDocument instead, which adds `#`
// headings, ``` fenced code, `**bold**`, and indented list-item continuations.

const BULLET   = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
const CODE     = /`([^`]+)`/;   // an unpaired backtick stays literal
// Document-only (renderDocument):
const HEADING  = /^(#{1,6})\s+(.*)$/;
const FENCE    = /^\s*```/;
const BOLD     = /\*\*([^*]+)\*\*/;

// Group lines into blocks: { type: 'p' | 'ul' | 'ol', lines, start }. With
// `continuation`, an indented line inside a list extends the previous item
// (documents wrap long items; descriptions don't).
function parseBlocks(text, { continuation = false } = {}) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    const b = BULLET.exec(line);
    const n = b ? null : NUMBERED.exec(line);
    if (continuation && !b && !n && cur && cur.type !== 'p' && /^\s+\S/.test(line)) {
      cur.lines[cur.lines.length - 1] += ' ' + line.trim();
      continue;
    }
    const type = b ? 'ul' : n ? 'ol' : line.trim() ? 'p' : null;
    if (!type) { cur = null; continue; }            // blank line ends any block
    if (!cur || cur.type !== type) {
      blocks.push(cur = { type, lines: [], start: n ? Number(n[1]) : 1 });
    }
    cur.lines.push(b ? b[1] : n ? n[2] : line);
  }
  return blocks;
}

// Append `text` to `el`, rendering backtick runs as <code class="md-code">, and
// (with `bold`) `**runs**` outside code as <strong>.
export function appendInline(el, text, { bold = false } = {}) {
  String(text).split(CODE).forEach((part, i) => {  // odd indices are the code runs
    if (i % 2 === 1) {
      const code = document.createElement('code');
      code.className   = 'md-code';
      code.textContent = part;
      el.appendChild(code);
    } else if (part && bold) {
      part.split(BOLD).forEach((run, j) => {        // odd indices are the bold runs
        if (j % 2 === 1) {
          const strong = document.createElement('strong');
          strong.textContent = run;
          el.appendChild(strong);
        } else if (run) {
          el.appendChild(document.createTextNode(run));
        }
      });
    } else if (part) {
      el.appendChild(document.createTextNode(part));
    }
  });
}

// Append the rendered blocks of `text` to `el`.
function appendBlocks(el, text, opts = {}) {
  for (const block of parseBlocks(text, opts)) {
    if (block.type === 'p') {
      const p = document.createElement('p');
      appendInline(p, block.lines.join('\n'), opts);
      el.appendChild(p);
      continue;
    }
    const list = document.createElement(block.type);
    if (block.type === 'ol' && block.start !== 1) list.start = block.start;
    for (const item of block.lines) {
      const li = document.createElement('li');
      appendInline(li, item, opts);
      list.appendChild(li);
    }
    el.appendChild(list);
  }
}

// Replace `el`'s contents with the rendered description.
export function renderMarkdown(el, text) {
  el.replaceChildren();
  appendBlocks(el, text);
}

// ─── Document markdown ────────────────────────────────────────────────────────
// Replace `el`'s contents with a rendered document: the description subset plus
// `#`–`######` headings, ``` fenced code blocks (kept verbatim), `**bold**`, and
// indented list-item continuations. Paragraph lines are left joined by '\n';
// the container's CSS decides whether they wrap like markdown soft breaks.
export function renderDocument(el, text) {
  el.replaceChildren();
  const opts = { continuation: true, bold: true };
  const lines = String(text).split('\n');
  let prose = [];
  const flush = () => { if (prose.length) appendBlocks(el, prose.join('\n'), opts); prose = []; };

  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      flush();
      const code = [];
      while (++i < lines.length && !FENCE.test(lines[i])) code.push(lines[i]);
      const pre = document.createElement('pre');
      pre.className   = 'md-pre';
      pre.textContent = code.join('\n');
      el.appendChild(pre);
      continue;
    }
    const h = HEADING.exec(lines[i]);
    if (h) {
      flush();
      const heading = document.createElement(`h${h[1].length}`);
      appendInline(heading, h[2], opts);
      el.appendChild(heading);
      continue;
    }
    prose.push(lines[i]);
  }
  flush();
}

// Single-line plain-text form, for places that can't hold markup (the SVG
// inline caption): markers and backticks dropped, paragraphs and list items
// joined by ' · '.
export function markdownToPlainText(text) {
  return parseBlocks(text)
    .flatMap(block => (block.type === 'p' ? [block.lines.join(' ')] : block.lines))
    .map(line => line.replace(new RegExp(CODE.source, 'g'), '$1').trim())
    .join(' · ');
}
