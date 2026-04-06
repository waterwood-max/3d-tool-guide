/* ===== SHORTCUTS PRO — GUIDE JS ===== */

(function () {
  'use strict';

  // ---- State ----
  let currentTool = null;
  let currentCategory = 'all';
  let searchQuery = '';
  let currentOS = 'mac';
  let toolsData = {};
  let crossRefMap = {};
  let expandedItems = new Set();

  // ---- DOM refs ----
  const toolTabs       = document.querySelectorAll('.tool-tab');
  const searchInput    = document.getElementById('searchInput');
  const commandCount   = document.getElementById('commandCount');
  const itemsContainer = document.getElementById('itemsContainer');
  const catList        = document.getElementById('catList');
  const osToggle       = document.getElementById('osToggle');

  // ---- Init ----
  function init() {
    toolsData = window.GUIDE_DATA || {};
    buildCrossRefMap();

    const hash = location.hash.replace('#', '');
    const validTools = Object.keys(toolsData);
    currentTool = validTools.includes(hash) ? hash : validTools[0];

    toolTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTool(tab.dataset.tool));
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        render();
      });
    }

    // OS Toggle
    if (osToggle) {
      osToggle.querySelectorAll('.os-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentOS = btn.dataset.os;
          updateOSToggle();
          render();
        });
      });
    }

    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#', '');
      if (toolsData[h] && h !== currentTool) switchTool(h, false);
    });

    updateOSToggle();
    renderToolTabs();
    switchTool(currentTool, false);
  }

  // ---- Cross Reference Map ----
  function buildCrossRefMap() {
    const c4dItems     = (toolsData['c4d']     || {}).items || [];
    const blenderItems = (toolsData['blender'] || {}).items || [];

    crossRefMap['c4d']     = {};
    crossRefMap['blender'] = {};

    c4dItems.forEach(item => {
      const match = findCrossMatch(item, blenderItems);
      if (match) crossRefMap['c4d'][item.id] = match;
    });

    blenderItems.forEach(item => {
      const match = findCrossMatch(item, c4dItems);
      if (match) crossRefMap['blender'][item.id] = match;
    });
  }

  function normName(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function findCrossMatch(item, candidates) {
    const n = normName(item.name);
    if (n.length < 3) return null;
    // 1. Exact normalized match
    let found = candidates.find(c => normName(c.name) === n);
    if (found) return found;
    // 2. Substring match (both directions, min 4 chars)
    if (n.length >= 4) {
      found = candidates.find(c => {
        const cn = normName(c.name);
        return (cn.length >= 4 && cn.includes(n)) || (n.includes(cn) && cn.length >= 4);
      });
    }
    return found || null;
  }

  // ---- OS Toggle ----
  function updateOSToggle() {
    if (!osToggle) return;
    osToggle.querySelectorAll('.os-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.os === currentOS);
    });
    osToggle.classList.toggle('win-mode', currentOS === 'win');
  }

  // ---- Tool Switch ----
  function switchTool(toolId, updateHash = true) {
    if (!toolsData[toolId]) return;
    currentTool = toolId;
    currentCategory = 'all';
    searchQuery = '';
    expandedItems.clear();
    if (searchInput) searchInput.value = '';
    if (updateHash) history.replaceState(null, '', '#' + toolId);
    renderToolTabs();
    renderCategoryList();
    render();
  }

  // ---- Render Tool Tabs ----
  function renderToolTabs() {
    toolTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tool === currentTool);
    });
  }

  // ---- Render Category List ----
  function renderCategoryList() {
    if (!catList) return;
    const data = toolsData[currentTool];
    if (!data) return;
    const items = data.items || [];
    const cats = getOrderedCategories(items);
    const counts = {};
    items.forEach(item => {
      const c = item.category || 'General';
      counts[c] = (counts[c] || 0) + 1;
    });

    let html = `
      <div class="category-item ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">
        <span class="cat-name">All Commands</span>
        <span class="cat-count">${items.length}</span>
      </div>
    `;
    cats.forEach(cat => {
      html += `
        <div class="category-item ${currentCategory === cat ? 'active' : ''}" data-cat="${escHtml(cat)}">
          <span class="cat-name">${escHtml(cat)}</span>
          <span class="cat-count">${counts[cat] || 0}</span>
        </div>
      `;
    });
    catList.innerHTML = html;

    catList.querySelectorAll('.category-item').forEach(el => {
      el.addEventListener('click', () => {
        currentCategory = el.dataset.cat;
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        renderCategoryList();
        render();
      });
    });
  }

  // ---- Main Render ----
  function render() {
    if (!itemsContainer) return;
    const data = toolsData[currentTool];
    if (!data) { itemsContainer.innerHTML = '<div class="empty-state">데이터 없음</div>'; return; }

    const items = data.items || [];
    const filtered = filterItems(items);

    if (commandCount) {
      commandCount.innerHTML = `<span class="count-num">${filtered.length}</span> Commands`;
    }

    if (filtered.length === 0) {
      itemsContainer.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          결과 없음
        </div>`;
      return;
    }

    let html = '';
    if (searchQuery) {
      filtered.forEach(item => { html += renderItemRow(item); });
    } else {
      const cats = getOrderedCategories(filtered);
      cats.forEach(cat => {
        const catItems = filtered.filter(i => (i.category || 'General') === cat);
        if (!catItems.length) return;
        html += `
          <div class="cat-group-header">
            <span class="cat-group-title">${escHtml(cat)}</span>
            <span class="cat-group-divider"></span>
          </div>
        `;
        catItems.forEach(item => { html += renderItemRow(item); });
      });
    }
    itemsContainer.innerHTML = html;

    // Row click
    itemsContainer.querySelectorAll('.item-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.crossref-btn')) return;
        const itemId = row.dataset.id;

        if (row.classList.contains('has-detail')) {
          if (expandedItems.has(itemId)) {
            expandedItems.delete(itemId);
            row.classList.remove('expanded');
          } else {
            expandedItems.add(itemId);
            row.classList.add('expanded');
          }
        } else {
          itemsContainer.querySelectorAll('.item-row').forEach(r => r.classList.remove('highlighted'));
          row.classList.add('highlighted');
        }
      });
    });

    // Cross-ref buttons
    itemsContainer.querySelectorAll('.crossref-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const targetTool = btn.dataset.targetTool;
        const targetId   = btn.dataset.targetId;
        switchTool(targetTool);
        setTimeout(() => {
          const targetRow = itemsContainer.querySelector(`[data-id="${CSS.escape(targetId)}"]`);
          if (targetRow) {
            itemsContainer.querySelectorAll('.item-row').forEach(r => r.classList.remove('highlighted'));
            targetRow.classList.add('highlighted');
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 80);
      });
    });
  }

  // ---- Filter ----
  function filterItems(items) {
    let list = items;
    if (!searchQuery && currentCategory !== 'all') {
      list = list.filter(i => (i.category || 'General') === currentCategory);
    }
    if (searchQuery) {
      list = list.filter(i => {
        const name    = (i.name || '').toLowerCase();
        const desc    = (i.description || '').toLowerCase();
        const mac     = (i.mac || '').toLowerCase();
        const win     = (i.win || '').toLowerCase();
        const badge   = (i.badge || '').toLowerCase();
        const cat     = (i.category || '').toLowerCase();
        const usecase = (i.use_case || '').toLowerCase();
        return name.includes(searchQuery) || desc.includes(searchQuery) ||
               mac.includes(searchQuery)  || win.includes(searchQuery)  ||
               badge.includes(searchQuery) || cat.includes(searchQuery) ||
               usecase.includes(searchQuery);
      });
    }
    return list;
  }

  // ---- Render Item Row ----
  function renderItemRow(item) {
    const name       = escHtml(item.name || '');
    const desc       = escHtml(item.description || '');
    const badge      = item.badge || 'shortcut';
    const badgeClass = badgeClassName(badge);
    const badgeLabel = escHtml(badge.charAt(0).toUpperCase() + badge.slice(1));

    // Keys (OS-aware)
    const macKeys = item.mac ? renderKeys(item.mac) : '';
    const winKeys = item.win ? renderKeys(item.win) : '';
    let keysHtml = '';
    if (currentOS === 'mac' && macKeys) {
      keysHtml = `<div class="key-sequence">${macKeys}</div>`;
    } else if (currentOS === 'win' && winKeys) {
      keysHtml = `<div class="key-sequence">${winKeys}</div>`;
    } else if (!macKeys && !winKeys) {
      keysHtml = `<span class="no-key">—</span>`;
    } else {
      keysHtml = `<span class="no-key">—</span>`;
    }

    // Cross-reference chip
    let crossRefHtml = '';
    if (currentTool === 'c4d' && crossRefMap['c4d'] && crossRefMap['c4d'][item.id]) {
      const ref = crossRefMap['c4d'][item.id];
      crossRefHtml = `<button class="crossref-btn" data-target-tool="blender" data-target-id="${escHtml(ref.id)}">↔ Blender: ${escHtml(ref.name)}</button>`;
    } else if (currentTool === 'blender' && crossRefMap['blender'] && crossRefMap['blender'][item.id]) {
      const ref = crossRefMap['blender'][item.id];
      crossRefHtml = `<button class="crossref-btn" data-target-tool="c4d" data-target-id="${escHtml(ref.id)}">↔ C4D: ${escHtml(ref.name)}</button>`;
    }

    // Detail panel (all tools)
    const isOctane   = currentTool === 'octane';
    const connectsTo = item.connects_to || [];
    const useCase    = item.use_case || '';
    const example    = item.example || '';
    const nodeGraph  = Array.isArray(item.node_graph) && item.node_graph.length ? item.node_graph : null;
    const hasDetail  = !!(nodeGraph || (connectsTo.length && isOctane) || (example && isOctane));
    const isExpanded = expandedItems.has(item.id);

    // use_case: always visible inline
    const useCaseHtml = useCase
      ? `<div class="oct-usecase-inline">${escHtml(useCase)}</div>`
      : '';

    let octaneDetail = '';
    if (hasDetail) {
      octaneDetail = `
        <div class="octane-detail">
          ${nodeGraph ? `
            <div class="oct-section">
              <span class="oct-label">노드 연결</span>
              ${renderNodeGraph(nodeGraph)}
            </div>` : ''}
          ${connectsTo.length && isOctane ? `
            <div class="oct-section">
              <span class="oct-label">연결 노드</span>
              <div class="oct-tags">
                ${connectsTo.map(n => `<span class="oct-tag">${escHtml(n)}</span>`).join('')}
              </div>
            </div>` : ''}
          ${example && isOctane ? `
            <div class="oct-section">
              <span class="oct-label">연결 예시</span>
              <pre class="oct-example">${escHtml(example)}</pre>
            </div>` : ''}
        </div>
      `;
    }

    // Expand chevron
    const chevron = hasDetail ? `<span class="item-chevron">${isExpanded ? '▾' : '▸'}</span>` : '';

    return `
      <div class="item-row${hasDetail ? ' has-detail' : ''}${isExpanded ? ' expanded' : ''}" data-id="${escHtml(item.id || '')}">
        <div class="item-main">
          <div class="item-info">
            <div class="item-name-row">
              ${chevron}
              <span class="item-name">${name}</span>
            </div>
            <div class="item-desc-row">
              <span class="item-desc">${desc}</span>
              <span class="badge ${badgeClass}">${badgeLabel}</span>
              ${crossRefHtml}
            </div>
            ${useCaseHtml}
          </div>
          <div class="item-keys">${keysHtml}</div>
        </div>
        ${octaneDetail}
      </div>
    `;
  }

  // ---- Render Keys ----
  function renderKeys(keyStr) {
    if (!keyStr || keyStr === '-') return '';
    const parts = keyStr.split(/\s*\+\s*/);
    return parts.map((part, idx) => {
      const key = `<kbd>${escHtml(part.trim())}</kbd>`;
      if (idx < parts.length - 1) return key + `<span class="key-plus">+</span>`;
      return key;
    }).join('');
  }

  // ---- Badge Class ----
  function badgeClassName(badge) {
    const map = {
      'shortcut':   'badge-shortcut',
      'material':   'badge-material',
      'texture':    'badge-texture',
      'procedural': 'badge-procedural',
      'utility':    'badge-utility',
      'modifier':   'badge-modifier',
      'mograph':    'badge-mograph',
      'generator':  'badge-generator',
      'edit mode':  'badge-edit-mode',
    };
    return map[badge.toLowerCase()] || 'badge-default';
  }

  // ---- Helpers ----
  function getOrderedCategories(items) {
    const seen = [];
    items.forEach(item => {
      const c = item.category || 'General';
      if (!seen.includes(c)) seen.push(c);
    });
    return seen;
  }

  // ---- Node Graph SVG Renderer ----
  function renderNodeGraph(graph) {
    if (!graph || !graph.length) return '';

    const NW = 148, HEADER = 26, PORT_H = 17, PORT_PAD = 5;
    const COL_GAP = 72, ROW_GAP = 10, PAD = 14;

    // Collect unique nodes & determine columns
    const allFrom = new Set(graph.map(c => c.from));
    const allTo   = new Set(graph.map(c => c.to));
    const leftNodes = [...allFrom].filter(n => !allTo.has(n));
    const rightNodes = [...allTo].filter(n => !allFrom.has(n));
    const midNodes  = [...allFrom].filter(n => allTo.has(n));

    const cols = [];
    if (leftNodes.length) cols.push(leftNodes);
    if (midNodes.length)  cols.push(midNodes);
    if (rightNodes.length) cols.push(rightNodes);
    if (!cols.length) return '';

    function getInPorts(n)  { return [...new Set(graph.filter(c => c.to   === n).map(c => c.in))]; }
    function getOutPorts(n) { return [...new Set(graph.filter(c => c.from === n).map(c => c.out))]; }
    function nodeH(n) {
      return HEADER + PORT_PAD + Math.max(getInPorts(n).length, getOutPorts(n).length, 1) * PORT_H + PORT_PAD;
    }

    // Node type → colors
    function nodeColors(name) {
      const n = name.toLowerCase();
      if (/\b(material output|world output|composite)\b/.test(n))
        return { bg:'#222', hd:'#444', bd:'#666', tx:'#ccc', pt:'#999' };
      if (/\b(principled bsdf|universal material|glossy|diffuse material|specular material|mix material|mix shader|add shader|emission shader|glass bsdf|sss|subsurface|hair material|toon|shadow catcher|composite material)\b/.test(n))
        return { bg:'#122212', hd:'#1e4020', bd:'#2d6030', tx:'#7dcc7d', pt:'#4daa4d' };
      if (/\b(image texture|float image|alpha image|rgb spectrum|gaussian|vertex map|environment texture|hdri)\b/.test(n))
        return { bg:'#0e0e22', hd:'#1a1a3a', bd:'#3535aa', tx:'#8888ee', pt:'#5555cc' };
      if (/\b(noise|turbulence|marble|ridged|checks|saw wave|sine wave|gradient|checker|brick|white noise|musgrave|voronoi|wave)\b/.test(n))
        return { bg:'#1a1022', hd:'#2e1a40', bd:'#6633aa', tx:'#bb88ee', pt:'#9955cc' };
      if (/\b(mix texture|multiply|add texture|subtract|clamp|mix color|color ramp|colorramp|hue|brightness|gamma|invert|rgb to bw|separate|combine)\b/.test(n))
        return { bg:'#221a00', hd:'#3a2c00', bd:'#886600', tx:'#ddaa33', pt:'#bb8800' };
      if (/\b(normal map|bump|displacement|uvw transform|mapping|texture coord|vector math|separate xyz|combine xyz)\b/.test(n))
        return { bg:'#001a22', hd:'#002e3a', bd:'#006688', tx:'#44aacc', pt:'#2288aa' };
      if (/\b(render layers|file output|viewer|alpha over|z combine|defocus|glare|blur|lens|denoise|cryptomatte|exposure|vignette|color balance|hue correct)\b/.test(n))
        return { bg:'#220a0a', hd:'#3a1010', bd:'#882222', tx:'#ee7777', pt:'#cc4444' };
      // default (input / utility)
      return { bg:'#141420', hd:'#202035', bd:'#404060', tx:'#aaaacc', pt:'#6666aa' };
    }

    // Position nodes
    const nodePos = new Map();
    let svgH = PAD;
    cols.forEach((col, ci) => {
      const x = PAD + ci * (NW + COL_GAP);
      let y = PAD;
      col.forEach(name => {
        const h = nodeH(name);
        nodePos.set(name, { x, y, h });
        y += h + ROW_GAP;
      });
      svgH = Math.max(svgH, y);
    });
    const svgW = PAD + cols.length * (NW + COL_GAP) - COL_GAP + PAD;
    const totalH = svgH + PAD;

    function portY(name, port, isIn) {
      const pos = nodePos.get(name);
      if (!pos) return 0;
      const ports = isIn ? getInPorts(name) : getOutPorts(name);
      const idx = Math.max(ports.indexOf(port), 0);
      return pos.y + HEADER + PORT_PAD + idx * PORT_H + PORT_H / 2;
    }

    function truncate(s, max) { return s.length > max ? s.slice(0, max - 1) + '…' : s; }
    function sx(v) { return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    let body = '';

    // Connections (drawn first, behind nodes)
    graph.forEach(conn => {
      if (!nodePos.has(conn.from) || !nodePos.has(conn.to)) return;
      const fp = nodePos.get(conn.from);
      const tp = nodePos.get(conn.to);
      const x1 = fp.x + NW, y1 = portY(conn.from, conn.out, false);
      const x2 = tp.x,      y2 = portY(conn.to,   conn.in,  true);
      const cp = Math.max(Math.abs(x2 - x1) * 0.45, 30);
      const fc = nodeColors(conn.from), tc = nodeColors(conn.to);
      body += `<path d="M${x1},${y1} C${x1+cp},${y1} ${x2-cp},${y2} ${x2},${y2}" fill="none" stroke="${fc.pt}" stroke-width="1.6" opacity="0.7"/>`;
    });

    // Nodes
    nodePos.forEach((pos, name) => {
      const { x, y, h } = pos;
      const c = nodeColors(name);
      const inPorts = getInPorts(name), outPorts = getOutPorts(name);

      body += `<rect x="${x}" y="${y}" width="${NW}" height="${h}" rx="5" fill="${c.bg}" stroke="${c.bd}" stroke-width="1.2"/>`;
      body += `<rect x="${x}" y="${y}" width="${NW}" height="${HEADER}" rx="5" fill="${c.hd}"/>`;
      body += `<rect x="${x}" y="${y+HEADER-4}" width="${NW}" height="4" fill="${c.hd}"/>`;
      body += `<text x="${x+NW/2}" y="${y+HEADER-7}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${c.tx}" font-family="-apple-system,sans-serif">${sx(truncate(name,18))}</text>`;

      inPorts.forEach((port, i) => {
        const py = y + HEADER + PORT_PAD + i * PORT_H + PORT_H / 2;
        body += `<circle cx="${x}" cy="${py}" r="4" fill="${c.pt}" stroke="${c.bg}" stroke-width="1"/>`;
        body += `<text x="${x+8}" y="${py+3.5}" font-size="8.5" fill="${c.tx}" opacity="0.9" font-family="-apple-system,sans-serif">${sx(truncate(port,16))}</text>`;
      });

      outPorts.forEach((port, i) => {
        const py = y + HEADER + PORT_PAD + i * PORT_H + PORT_H / 2;
        body += `<circle cx="${x+NW}" cy="${py}" r="4" fill="${c.pt}" stroke="${c.bg}" stroke-width="1"/>`;
        body += `<text x="${x+NW-8}" y="${py+3.5}" font-size="8.5" fill="${c.tx}" opacity="0.9" text-anchor="end" font-family="-apple-system,sans-serif">${sx(truncate(port,16))}</text>`;
      });
    });

    return `<div class="node-graph-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}">${body}</svg></div>`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---- Boot ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
