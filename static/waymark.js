// ─── Waymark panel ────────────────────────────────────────────────────────────
// A waymark (`waymark.md`) is a codebase's short, kept-current summary — the
// "what is this?" read that complements the map's in-depth graph. The backend
// discovers them (config.rs): one at the map's own root, and one per node that
// roots a codebase (an include mount, or a directory binding holding one). This
// module shows one in a modal popup, re-fetched on every open so it's never stale.

import { fetchWaymark } from './api.js';
import { renderDocument } from './markdown.js';

const panel = () => document.getElementById('waymark-panel');

// Open the waymark for `node` (a node object with a `waymark`), or for the map's
// own root when `node` is null.
export async function openWaymark(node = null) {
  let data;
  try {
    data = await fetchWaymark(node ? node.id : null);
  } catch (e) {
    console.warn(e.message);
    return;
  }

  const p = panel();
  p.replaceChildren();

  const card = document.createElement('div');
  card.className = 'help-card waymark-card';

  const head = document.createElement('div');
  head.className = 'help-title';
  const title = document.createElement('span');
  title.textContent = node ? `waymark · ${node.label}` : 'waymark';
  const path = document.createElement('span');
  path.className = 'waymark-path';
  path.textContent = data.path;
  const close = document.createElement('button');
  close.className = 'help-close';
  close.textContent = '✕';
  close.title = 'Close (W or Esc)';
  close.addEventListener('click', closeWaymark);
  head.append(title, path, close);

  const body = document.createElement('div');
  body.className = 'waymark-body';
  renderDocument(body, data.content);

  card.append(head, body);
  p.appendChild(card);
  p.classList.remove('hidden');
}

export function isWaymarkOpen() { return !panel().classList.contains('hidden'); }
export function closeWaymark()  { panel().classList.add('hidden'); }

// Click the backdrop (but not the card) to dismiss.
panel().addEventListener('click', e => { if (e.target === panel()) closeWaymark(); });
