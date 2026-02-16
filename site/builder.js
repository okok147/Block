const STORAGE_KEY = "block_visual_builder_v1";

const state = {
  blocks: [],
  selectedId: null,
  dirty: false
};

const elements = {
  addRootBtn: document.getElementById("addRootBtn"),
  addChildBtn: document.getElementById("addChildBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  saveStatus: document.getElementById("saveStatus"),
  treeMeta: document.getElementById("treeMeta"),
  treeCanvas: document.getElementById("treeCanvas"),
  blockNodeTemplate: document.getElementById("blockNodeTemplate"),
  valueRowTemplate: document.getElementById("valueRowTemplate"),
  emptyDetail: document.getElementById("emptyDetail"),
  detailForm: document.getElementById("detailForm"),
  titleInput: document.getElementById("titleInput"),
  typeInput: document.getElementById("typeInput"),
  statusInput: document.getElementById("statusInput"),
  tagsInput: document.getElementById("tagsInput"),
  notesInput: document.getElementById("notesInput"),
  addValueBtn: document.getElementById("addValueBtn"),
  valuesList: document.getElementById("valuesList"),
  deleteBlockBtn: document.getElementById("deleteBlockBtn"),
  addChildInFormBtn: document.getElementById("addChildInFormBtn")
};

function makeId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function setStatus(text) {
  elements.saveStatus.textContent = text;
}

function markDirty() {
  state.dirty = true;
  setStatus("Unsaved changes...");
}

function saveState() {
  const payload = {
    version: 1,
    updatedAt: nowIso(),
    blocks: state.blocks
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  state.dirty = false;
  setStatus(`Saved ${new Date().toLocaleTimeString()}`);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.blocks)) {
      return;
    }

    state.blocks = parsed.blocks
      .map((block) => ({
        id: String(block.id || makeId()),
        parentId: block.parentId ? String(block.parentId) : null,
        title: String(block.title || "Untitled Block"),
        type: String(block.type || ""),
        status: String(block.status || ""),
        tags: String(block.tags || ""),
        notes: String(block.notes || ""),
        values: Array.isArray(block.values)
          ? block.values.map((item) => ({
              key: String(item?.key || ""),
              value: String(item?.value || "")
            }))
          : [],
        createdAt: String(block.createdAt || nowIso()),
        updatedAt: String(block.updatedAt || nowIso())
      }))
      .filter((block) => block.id);

    normalizeStructure();

    if (state.blocks.length > 0) {
      state.selectedId = state.blocks[0].id;
    }
  } catch {
    setStatus("Unable to load saved state.");
  }
}

function selectedBlock() {
  return state.blocks.find((block) => block.id === state.selectedId) || null;
}

function blockChildren(parentId) {
  return state.blocks.filter((block) => block.parentId === parentId);
}

function normalizeStructure() {
  const idSet = new Set(state.blocks.map((block) => block.id));
  for (const block of state.blocks) {
    if (!block.parentId) {
      continue;
    }
    if (block.parentId === block.id || !idSet.has(block.parentId)) {
      block.parentId = null;
    }
  }
}

function descendantIds(blockId) {
  const ids = [];
  const stack = [blockId];

  while (stack.length > 0) {
    const current = stack.pop();
    const children = blockChildren(current);
    for (const child of children) {
      ids.push(child.id);
      stack.push(child.id);
    }
  }

  return ids;
}

function createBlock(parentId = null) {
  const block = {
    id: makeId(),
    parentId,
    title: "New Block",
    type: "",
    status: "draft",
    tags: "",
    notes: "",
    values: [{ key: "", value: "" }],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  state.blocks.push(block);
  state.selectedId = block.id;
  markDirty();
  saveState();
  render();
}

function updateBlock(patch) {
  const block = selectedBlock();
  if (!block) {
    return;
  }

  Object.assign(block, patch, { updatedAt: nowIso() });
  markDirty();
  saveState();
  renderTree();
}

function removeBlock(blockId) {
  const removeIds = new Set([blockId, ...descendantIds(blockId)]);
  state.blocks = state.blocks.filter((block) => !removeIds.has(block.id));

  if (state.blocks.length === 0) {
    state.selectedId = null;
  } else if (removeIds.has(state.selectedId)) {
    state.selectedId = state.blocks[0].id;
  }

  markDirty();
  saveState();
  render();
}

function exportState() {
  const payload = {
    version: 1,
    exportedAt: nowIso(),
    blocks: state.blocks
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeDate = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `block-visual-${safeDate}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Export complete.");
}

async function importState(file) {
  if (!file) {
    return;
  }

  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.blocks)) {
    throw new Error("Invalid JSON format");
  }

  state.blocks = parsed.blocks.map((block) => ({
    id: String(block.id || makeId()),
    parentId: block.parentId ? String(block.parentId) : null,
    title: String(block.title || "Untitled Block"),
    type: String(block.type || ""),
    status: String(block.status || ""),
    tags: String(block.tags || ""),
    notes: String(block.notes || ""),
    values: Array.isArray(block.values)
      ? block.values.map((item) => ({ key: String(item?.key || ""), value: String(item?.value || "") }))
      : [],
    createdAt: String(block.createdAt || nowIso()),
    updatedAt: String(block.updatedAt || nowIso())
  }));

  normalizeStructure();
  state.selectedId = state.blocks[0]?.id || null;
  markDirty();
  saveState();
  render();
  setStatus(`Imported ${state.blocks.length} blocks.`);
}

function renderTreeNode(block, depth = 0, visited = new Set()) {
  if (visited.has(block.id)) {
    return document.createTextNode("");
  }
  visited.add(block.id);

  const fragment = elements.blockNodeTemplate.content.cloneNode(true);
  const wrapper = fragment.querySelector(".block-node");
  const button = fragment.querySelector(".node-button");
  const title = fragment.querySelector(".node-title");
  const meta = fragment.querySelector(".node-meta");
  const childrenSlot = fragment.querySelector(".node-children");

  wrapper.style.marginLeft = `${Math.min(depth * 16, 64)}px`;
  button.dataset.id = block.id;
  title.textContent = block.title || "Untitled Block";

  const childCount = blockChildren(block.id).length;
  const typeLabel = block.type ? block.type : "untyped";
  meta.textContent = `${typeLabel} | ${childCount} child${childCount === 1 ? "" : "ren"}`;

  if (state.selectedId === block.id) {
    button.classList.add("active");
  }

  button.addEventListener("click", () => {
    state.selectedId = block.id;
    render();
  });

  const children = blockChildren(block.id);
  for (const child of children) {
    childrenSlot.appendChild(renderTreeNode(child, depth + 1, new Set(visited)));
  }

  return fragment;
}

function renderTree() {
  const roots = state.blocks.filter((block) => !block.parentId);
  elements.treeMeta.textContent = `${state.blocks.length} block${state.blocks.length === 1 ? "" : "s"}`;
  elements.treeCanvas.innerHTML = "";

  if (roots.length === 0) {
    elements.treeCanvas.classList.add("empty");
    elements.treeCanvas.textContent = "No blocks yet. Click \"Add Root Block\" to begin.";
    return;
  }

  elements.treeCanvas.classList.remove("empty");
  for (const root of roots) {
    elements.treeCanvas.appendChild(renderTreeNode(root, 0));
  }
}

function renderValues(block) {
  elements.valuesList.innerHTML = "";

  if (!Array.isArray(block.values) || block.values.length === 0) {
    block.values = [{ key: "", value: "" }];
  }

  block.values.forEach((item, index) => {
    const fragment = elements.valueRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".value-row");
    const keyInput = fragment.querySelector(".value-key");
    const valueInput = fragment.querySelector(".value-value");
    const removeButton = fragment.querySelector(".remove-value");

    keyInput.value = item.key;
    valueInput.value = item.value;

    keyInput.addEventListener("input", () => {
      block.values[index].key = keyInput.value;
      block.updatedAt = nowIso();
      markDirty();
      saveState();
    });

    valueInput.addEventListener("input", () => {
      block.values[index].value = valueInput.value;
      block.updatedAt = nowIso();
      markDirty();
      saveState();
    });

    removeButton.addEventListener("click", () => {
      block.values.splice(index, 1);
      block.updatedAt = nowIso();
      markDirty();
      saveState();
      renderValues(block);
    });

    row.dataset.index = String(index);
    elements.valuesList.appendChild(fragment);
  });
}

function renderDetail() {
  const block = selectedBlock();

  if (!block) {
    elements.emptyDetail.hidden = false;
    elements.detailForm.hidden = true;
    return;
  }

  elements.emptyDetail.hidden = true;
  elements.detailForm.hidden = false;

  elements.titleInput.value = block.title;
  elements.typeInput.value = block.type;
  elements.statusInput.value = block.status;
  elements.tagsInput.value = block.tags;
  elements.notesInput.value = block.notes;

  renderValues(block);
}

function render() {
  renderTree();
  renderDetail();
}

function wireInputs() {
  elements.addRootBtn.addEventListener("click", () => {
    createBlock(null);
  });

  elements.addChildBtn.addEventListener("click", () => {
    if (!state.selectedId) {
      createBlock(null);
      return;
    }
    createBlock(state.selectedId);
  });

  elements.addChildInFormBtn.addEventListener("click", () => {
    if (!state.selectedId) {
      createBlock(null);
      return;
    }
    createBlock(state.selectedId);
  });

  elements.exportBtn.addEventListener("click", () => {
    exportState();
  });

  elements.importInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await importState(file);
    } catch {
      setStatus("Import failed. Use valid Block JSON.");
    }
    event.target.value = "";
  });

  elements.clearAllBtn.addEventListener("click", () => {
    const proceed = window.confirm("Delete all blocks from this browser?");
    if (!proceed) {
      return;
    }
    state.blocks = [];
    state.selectedId = null;
    markDirty();
    saveState();
    render();
  });

  elements.titleInput.addEventListener("input", (event) => {
    updateBlock({ title: event.target.value || "Untitled Block" });
  });

  elements.typeInput.addEventListener("input", (event) => {
    updateBlock({ type: event.target.value });
  });

  elements.statusInput.addEventListener("input", (event) => {
    updateBlock({ status: event.target.value });
  });

  elements.tagsInput.addEventListener("input", (event) => {
    updateBlock({ tags: event.target.value });
  });

  elements.notesInput.addEventListener("input", (event) => {
    updateBlock({ notes: event.target.value });
  });

  elements.addValueBtn.addEventListener("click", () => {
    const block = selectedBlock();
    if (!block) {
      return;
    }
    block.values.push({ key: "", value: "" });
    block.updatedAt = nowIso();
    markDirty();
    saveState();
    renderValues(block);
  });

  elements.deleteBlockBtn.addEventListener("click", () => {
    const block = selectedBlock();
    if (!block) {
      return;
    }

    const childTotal = descendantIds(block.id).length;
    const proceed = window.confirm(
      childTotal > 0
        ? `Delete this block and ${childTotal} descendant block(s)?`
        : "Delete this block?"
    );

    if (!proceed) {
      return;
    }

    removeBlock(block.id);
  });

  window.addEventListener("beforeunload", () => {
    if (state.dirty) {
      saveState();
    }
  });
}

function initialize() {
  loadState();
  wireInputs();
  render();
  if (state.blocks.length === 0) {
    setStatus("No saved blocks yet. Start by adding a root block.");
  } else {
    setStatus(`Loaded ${state.blocks.length} block${state.blocks.length === 1 ? "" : "s"}.`);
  }
}

initialize();
