const STORAGE_KEY = "block_visual_builder_v1";

const GRID = {
  pad: 20,
  col: 180,
  row: 120,
  nodeW: 156,
  nodeH: 78,
  maxSearchRadius: 60
};

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

function sanitizeBlock(rawBlock, index) {
  const id = String(rawBlock?.id || makeId());
  const gxRaw = Number(rawBlock?.gx);
  const gyRaw = Number(rawBlock?.gy);

  return {
    id,
    parentId: rawBlock?.parentId ? String(rawBlock.parentId) : null,
    title: String(rawBlock?.title || "New Block"),
    type: String(rawBlock?.type || ""),
    status: String(rawBlock?.status || "draft"),
    tags: String(rawBlock?.tags || ""),
    notes: String(rawBlock?.notes || ""),
    values: Array.isArray(rawBlock?.values)
      ? rawBlock.values.map((item) => ({
          key: String(item?.key || ""),
          value: String(item?.value || "")
        }))
      : [{ key: "", value: "" }],
    gx: Number.isFinite(gxRaw) ? Math.max(0, Math.round(gxRaw)) : index % 6,
    gy: Number.isFinite(gyRaw) ? Math.max(0, Math.round(gyRaw)) : Math.floor(index / 6),
    createdAt: String(rawBlock?.createdAt || nowIso()),
    updatedAt: String(rawBlock?.updatedAt || nowIso())
  };
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

    state.blocks = parsed.blocks.map((block, index) => sanitizeBlock(block, index)).filter((block) => block.id);
    normalizeStructure();

    if (state.blocks.length > 0) {
      state.selectedId = state.blocks[0].id;
    }
  } catch {
    setStatus("Unable to load saved blocks.");
  }
}

function getBlockById(blockId) {
  return state.blocks.find((block) => block.id === blockId) || null;
}

function selectedBlock() {
  return getBlockById(state.selectedId);
}

function blockChildren(parentId) {
  return state.blocks.filter((block) => block.parentId === parentId);
}

function wouldCreateCycle(blockId, parentId) {
  if (!parentId) {
    return false;
  }

  const visited = new Set();
  let currentId = parentId;

  while (currentId) {
    if (currentId === blockId) {
      return true;
    }

    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);

    const current = getBlockById(currentId);
    if (!current || !current.parentId) {
      break;
    }
    currentId = current.parentId;
  }

  return false;
}

function keyForCell(gx, gy) {
  return `${gx},${gy}`;
}

function occupiedCells(excludeId = null) {
  const set = new Set();
  for (const block of state.blocks) {
    if (excludeId && block.id === excludeId) {
      continue;
    }
    set.add(keyForCell(block.gx, block.gy));
  }
  return set;
}

function findFreeGridCell(startGx, startGy, occupied) {
  const originX = Math.max(0, Math.round(startGx));
  const originY = Math.max(0, Math.round(startGy));

  if (!occupied.has(keyForCell(originX, originY))) {
    return [originX, originY];
  }

  for (let radius = 1; radius <= GRID.maxSearchRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue;
        }

        const candidateX = originX + dx;
        const candidateY = originY + dy;
        if (candidateX < 0 || candidateY < 0) {
          continue;
        }

        if (!occupied.has(keyForCell(candidateX, candidateY))) {
          return [candidateX, candidateY];
        }
      }
    }
  }

  return [originX + GRID.maxSearchRadius + 1, originY];
}

function normalizePositions() {
  const occupied = new Set();
  let fallbackSeed = 0;

  for (const block of state.blocks) {
    let gx = Number(block.gx);
    let gy = Number(block.gy);

    if (!Number.isFinite(gx) || gx < 0 || !Number.isFinite(gy) || gy < 0) {
      gx = fallbackSeed % 6;
      gy = Math.floor(fallbackSeed / 6);
      fallbackSeed += 1;
    }

    gx = Math.round(gx);
    gy = Math.round(gy);

    const key = keyForCell(gx, gy);
    if (occupied.has(key)) {
      const [nextGx, nextGy] = findFreeGridCell(gx, gy, occupied);
      block.gx = nextGx;
      block.gy = nextGy;
      occupied.add(keyForCell(nextGx, nextGy));
    } else {
      block.gx = gx;
      block.gy = gy;
      occupied.add(key);
    }
  }
}

function normalizeStructure() {
  const idSet = new Set(state.blocks.map((block) => block.id));

  for (const block of state.blocks) {
    if (!block.parentId) {
      continue;
    }

    if (!idSet.has(block.parentId) || block.parentId === block.id || wouldCreateCycle(block.id, block.parentId)) {
      block.parentId = null;
    }
  }

  normalizePositions();
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

function defaultStartCell(parentId) {
  if (parentId) {
    const parent = getBlockById(parentId);
    if (parent) {
      return [parent.gx + 1, parent.gy];
    }
  }

  return [0, 0];
}

function createBlock({ parentId = null, gx = null, gy = null } = {}) {
  if (parentId && !getBlockById(parentId)) {
    parentId = null;
  }

  const occupied = occupiedCells();
  let targetX;
  let targetY;

  if (Number.isFinite(Number(gx)) && Number.isFinite(Number(gy))) {
    targetX = Math.max(0, Math.round(Number(gx)));
    targetY = Math.max(0, Math.round(Number(gy)));
  } else {
    [targetX, targetY] = defaultStartCell(parentId);
  }

  const [finalX, finalY] = findFreeGridCell(targetX, targetY, occupied);

  const block = {
    id: makeId(),
    parentId,
    title: "New Block",
    type: "",
    status: "draft",
    tags: "",
    notes: "",
    values: [{ key: "", value: "" }],
    gx: finalX,
    gy: finalY,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  state.blocks.push(block);
  state.selectedId = block.id;
  markDirty();
  saveState();
  render();
  setStatus(`Created block at grid (${finalX}, ${finalY}).`);
}

function updateBlock(patch) {
  const block = selectedBlock();
  if (!block) {
    return;
  }

  Object.assign(block, patch, { updatedAt: nowIso() });
  markDirty();
  saveState();
  renderWorkspace();
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
  anchor.href = url;
  anchor.download = `block-grid-${new Date().toISOString().slice(0, 10)}.json`;
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
    throw new Error("Invalid JSON format.");
  }

  state.blocks = parsed.blocks.map((block, index) => sanitizeBlock(block, index));
  normalizeStructure();
  state.selectedId = state.blocks[0]?.id || null;
  markDirty();
  saveState();
  render();
  setStatus(`Imported ${state.blocks.length} blocks.`);
}

function blockCenter(block) {
  const x = GRID.pad + block.gx * GRID.col + GRID.nodeW / 2;
  const y = GRID.pad + block.gy * GRID.row + GRID.nodeH / 2;
  return { x, y };
}

function renderLinks(surfaceWidth, surfaceHeight) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.classList.add("links-layer");
  svg.setAttribute("width", String(surfaceWidth));
  svg.setAttribute("height", String(surfaceHeight));
  svg.setAttribute("viewBox", `0 0 ${surfaceWidth} ${surfaceHeight}`);

  for (const block of state.blocks) {
    if (!block.parentId) {
      continue;
    }

    const parent = getBlockById(block.parentId);
    if (!parent) {
      continue;
    }

    const from = blockCenter(parent);
    const to = blockCenter(block);

    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    svg.appendChild(line);
  }

  return svg;
}

function renderWorkspace() {
  elements.treeMeta.textContent = `${state.blocks.length} block${state.blocks.length === 1 ? "" : "s"}`;
  elements.treeCanvas.innerHTML = "";

  if (state.blocks.length === 0) {
    elements.treeCanvas.classList.add("empty");
    elements.treeCanvas.textContent = "Double-click on this paper grid to create your first block.";
    return;
  }

  elements.treeCanvas.classList.remove("empty");

  const maxGx = Math.max(...state.blocks.map((block) => block.gx));
  const maxGy = Math.max(...state.blocks.map((block) => block.gy));
  const minSurfaceWidth = Math.max(elements.treeCanvas.clientWidth - 2, 1);
  const minSurfaceHeight = Math.max(elements.treeCanvas.clientHeight - 2, 1);

  const surfaceWidth = Math.max(minSurfaceWidth, GRID.pad * 2 + (maxGx + 1) * GRID.col);
  const surfaceHeight = Math.max(minSurfaceHeight, GRID.pad * 2 + (maxGy + 1) * GRID.row);

  const surface = document.createElement("div");
  surface.className = "grid-surface";
  surface.style.width = `${surfaceWidth}px`;
  surface.style.height = `${surfaceHeight}px`;
  surface.appendChild(renderLinks(surfaceWidth, surfaceHeight));

  const sortedBlocks = [...state.blocks].sort((a, b) => {
    if (a.gy === b.gy) {
      return a.gx - b.gx;
    }
    return a.gy - b.gy;
  });

  for (const block of sortedBlocks) {
    const fragment = elements.blockNodeTemplate.content.cloneNode(true);
    const node = fragment.querySelector(".grid-node");
    const title = fragment.querySelector(".node-title");
    const meta = fragment.querySelector(".node-meta");

    node.dataset.id = block.id;
    node.style.left = `${GRID.pad + block.gx * GRID.col}px`;
    node.style.top = `${GRID.pad + block.gy * GRID.row}px`;

    title.textContent = block.title || "New Block";
    const typeLabel = block.type || "block";
    meta.textContent = `${typeLabel} | grid ${block.gx},${block.gy}`;

    if (block.id === state.selectedId) {
      node.classList.add("active");
    }

    node.addEventListener("click", () => {
      state.selectedId = block.id;
      render();
    });

    node.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      createBlock({ parentId: block.id, gx: block.gx + 1, gy: block.gy });
    });

    surface.appendChild(fragment);
  }

  elements.treeCanvas.appendChild(surface);
}

function renderValues(block) {
  elements.valuesList.innerHTML = "";

  if (!Array.isArray(block.values) || block.values.length === 0) {
    block.values = [{ key: "", value: "" }];
  }

  block.values.forEach((item, index) => {
    const fragment = elements.valueRowTemplate.content.cloneNode(true);
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
  renderWorkspace();
  renderDetail();
}

function wireInputs() {
  elements.addRootBtn.addEventListener("click", () => {
    createBlock({ parentId: null });
  });

  elements.addChildBtn.addEventListener("click", () => {
    if (!state.selectedId) {
      createBlock({ parentId: null });
      return;
    }
    createBlock({ parentId: state.selectedId });
  });

  elements.addChildInFormBtn.addEventListener("click", () => {
    if (!state.selectedId) {
      createBlock({ parentId: null });
      return;
    }
    createBlock({ parentId: state.selectedId });
  });

  elements.treeCanvas.addEventListener("dblclick", (event) => {
    const node = event.target.closest(".grid-node");
    if (node) {
      return;
    }

    const surface = elements.treeCanvas.querySelector(".grid-surface") || elements.treeCanvas;
    const rect = surface.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - GRID.pad;
    const offsetY = event.clientY - rect.top - GRID.pad;

    const gx = Math.max(0, Math.round(offsetX / GRID.col));
    const gy = Math.max(0, Math.round(offsetY / GRID.row));

    createBlock({ parentId: null, gx, gy });
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
    updateBlock({ title: event.target.value || "New Block" });
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

    const childCount = descendantIds(block.id).length;
    const prompt =
      childCount > 0
        ? `Delete this block and ${childCount} descendant block(s)?`
        : "Delete this block?";

    const proceed = window.confirm(prompt);
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
    setStatus("No blocks yet. Double-click the paper grid to create one.");
  } else {
    setStatus(`Loaded ${state.blocks.length} block${state.blocks.length === 1 ? "" : "s"}.`);
  }
}

initialize();
