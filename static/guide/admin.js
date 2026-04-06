/* ===== ADMIN TOOL SWITCHING ===== */
const urlParams = new URLSearchParams(location.search);
const initTool = urlParams.get('tool');
if (initTool) adminSwitchTool(initTool);

function adminSwitchTool(toolId) {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolId);
  });
  document.querySelectorAll('.admin-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `admin-pane-${toolId}`);
  });
}

/* ===== MODAL ===== */
function openAddModal(toolId) {
  document.getElementById('addToolId').value = toolId;
  document.getElementById('addModalOverlay').classList.remove('hidden');
}

function openEditModal(toolId, sectionId, title, content) {
  document.getElementById('editToolId').value = toolId;
  document.getElementById('editSectionId').value = sectionId;
  document.getElementById('editTitle').value = title;
  document.getElementById('editContent').value = content;
  document.getElementById('editModalOverlay').classList.remove('hidden');
}

function closeModal(type) {
  document.getElementById(`${type}ModalOverlay`).classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});

/* ===== DRAG & DROP REORDER ===== */
let dragSrc = null;

document.querySelectorAll('.section-list').forEach(list => {
  list.addEventListener('dragstart', e => {
    const item = e.target.closest('.section-item');
    if (!item) return;
    dragSrc = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    const item = e.target.closest('.section-item');
    if (!item || item === dragSrc) return;
    const rect = item.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      list.insertBefore(dragSrc, item);
    } else {
      list.insertBefore(dragSrc, item.nextSibling);
    }
  });

  list.addEventListener('dragend', async e => {
    if (!dragSrc) return;
    dragSrc.classList.remove('dragging');

    const toolId = dragSrc.dataset.tool;
    const items = list.querySelectorAll('.section-item');
    const orderedIds = Array.from(items).map(i => i.dataset.id);

    try {
      await fetch('/guide/admin/section/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId, ordered_ids: orderedIds })
      });
    } catch (err) {
      console.error('순서 저장 실패:', err);
    }

    dragSrc = null;
  });
});

// Make items draggable only via handle
document.querySelectorAll('.section-item').forEach(item => {
  item.setAttribute('draggable', 'false');
  const handle = item.querySelector('.section-item-handle');
  if (handle) {
    handle.addEventListener('mousedown', () => {
      item.setAttribute('draggable', 'true');
    });
    handle.addEventListener('mouseup', () => {
      setTimeout(() => item.setAttribute('draggable', 'false'), 100);
    });
  }
});
