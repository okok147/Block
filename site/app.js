const state = {
  data: null,
  activeField: "all",
  activeTags: new Set(),
  query: "",
  selectedId: null
};

const elements = {
  heroMetrics: document.getElementById("heroMetrics"),
  generatedAt: document.getElementById("generatedAt"),
  searchInput: document.getElementById("searchInput"),
  fieldFilters: document.getElementById("fieldFilters"),
  tagFilters: document.getElementById("tagFilters"),
  clearFilters: document.getElementById("clearFilters"),
  resultCount: document.getElementById("resultCount"),
  cardsGrid: document.getElementById("cardsGrid"),
  cardTemplate: document.getElementById("cardTemplate"),
  detailField: document.getElementById("detailField"),
  detailTitle: document.getElementById("detailTitle"),
  detailPath: document.getElementById("detailPath"),
  detailMeta: document.getElementById("detailMeta"),
  detailContent: document.getElementById("detailContent"),
  openSource: document.getElementById("openSource")
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(isoValue) {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function renderInline(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdownText(text) {
  const lines = text.split(/\r?\n/);
  const html = [];
  const listItems = [];
  let inCode = false;
  const codeLines = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    html.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems.length = 0;
  };

  const flushCode = () => {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines.length = 0;
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushList();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(renderInline(trimmed.slice(2).trim()));
      continue;
    }

    flushList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  flushList();
  if (inCode) {
    flushCode();
  }

  return html.join("");
}

function renderDetail(entry) {
  if (!entry) {
    elements.detailField.textContent = "Select a block";
    elements.detailTitle.textContent = "Knowledge Detail";
    elements.detailPath.textContent = "";
    elements.detailMeta.innerHTML = "";
    elements.detailContent.innerHTML = "<p>Pick any block card to inspect full sections and implementation notes.</p>";
    elements.openSource.setAttribute("href", "#");
    return;
  }

  elements.detailField.textContent = entry.fieldLabel;
  elements.detailTitle.textContent = entry.title;
  elements.detailPath.textContent = entry.relativePath;

  const metaPairs = Object.entries(entry.meta || {}).filter(([, value]) => value && !value.includes("<"));
  const metaHtml = [];

  for (const [key, value] of metaPairs) {
    metaHtml.push(`<span class="meta-pill">${escapeHtml(key)}: ${escapeHtml(value)}</span>`);
  }

  for (const tag of entry.tags || []) {
    metaHtml.push(`<span class="meta-pill">Tag: ${escapeHtml(tag)}</span>`);
  }

  elements.detailMeta.innerHTML = metaHtml.join("");

  const sectionHtml = (entry.sections || [])
    .map((section) => {
      return `<section><h4>${escapeHtml(section.heading)}</h4>${renderMarkdownText(section.content || "")}</section>`;
    })
    .join("");

  elements.detailContent.innerHTML = sectionHtml || `<p>${escapeHtml(entry.preview)}</p>`;
  elements.openSource.setAttribute("href", `../${entry.relativePath}`);
}

function updateSelectedCard() {
  const cards = elements.cardsGrid.querySelectorAll(".card");
  for (const card of cards) {
    card.classList.toggle("active", card.dataset.id === state.selectedId);
  }
}

function matchesQuery(entry, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    entry.title,
    entry.fieldLabel,
    entry.preview,
    ...(entry.tags || []),
    ...Object.values(entry.meta || {}),
    ...(entry.sections || []).flatMap((section) => [section.heading, section.content])
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function filteredEntries() {
  if (!state.data) {
    return [];
  }

  return state.data.entries.filter((entry) => {
    const fieldMatch = state.activeField === "all" || entry.field === state.activeField;
    if (!fieldMatch) {
      return false;
    }

    const queryMatch = matchesQuery(entry, state.query);
    if (!queryMatch) {
      return false;
    }

    if (state.activeTags.size === 0) {
      return true;
    }

    return [...state.activeTags].every((tag) => entry.tags.includes(tag));
  });
}

function renderCards() {
  const entries = filteredEntries();
  elements.cardsGrid.innerHTML = "";
  elements.resultCount.textContent = `${entries.length} block${entries.length === 1 ? "" : "s"}`;

  if (entries.length === 0) {
    elements.cardsGrid.innerHTML = '<div class="empty-state">No blocks match this filter. Adjust field, tags, or search terms.</div>';
    state.selectedId = null;
    renderDetail(null);
    return;
  }

  if (!entries.some((entry) => entry.id === state.selectedId)) {
    state.selectedId = entries[0].id;
  }

  entries.forEach((entry, index) => {
    const fragment = elements.cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".card");
    const fieldNode = fragment.querySelector(".card-field");
    const titleNode = fragment.querySelector(".card-title");
    const previewNode = fragment.querySelector(".card-preview");
    const tagsNode = fragment.querySelector(".card-tags");

    card.dataset.id = entry.id;
    card.style.animationDelay = `${Math.min(index * 30, 360)}ms`;
    fieldNode.textContent = entry.fieldLabel;
    titleNode.textContent = entry.title;
    previewNode.textContent = entry.preview || "No summary available.";

    if (entry.tags.length === 0) {
      tagsNode.innerHTML = '<span class="tag-pill">untagged</span>';
    } else {
      tagsNode.innerHTML = entry.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");
    }

    card.addEventListener("click", () => {
      state.selectedId = entry.id;
      updateSelectedCard();
      renderDetail(entry);
    });

    elements.cardsGrid.appendChild(fragment);
  });

  updateSelectedCard();
  const selectedEntry = entries.find((entry) => entry.id === state.selectedId);
  renderDetail(selectedEntry || entries[0]);
}

function renderFieldFilters() {
  if (!state.data) {
    return;
  }

  elements.fieldFilters.innerHTML = "";
  const allCount = state.data.entries.length;
  const options = [{ key: "all", label: "All", count: allCount }];

  for (const field of state.data.fields) {
    const count = state.data.counts.byField[field.key] || 0;
    options.push({ key: field.key, label: field.label, count });
  }

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip ${state.activeField === option.key ? "active" : ""}`;
    button.textContent = `${option.label} (${option.count})`;
    button.addEventListener("click", () => {
      state.activeField = option.key;
      renderFieldFilters();
      renderCards();
    });
    elements.fieldFilters.appendChild(button);
  }
}

function renderTagFilters() {
  if (!state.data) {
    return;
  }

  elements.tagFilters.innerHTML = "";
  const tags = state.data.tags;

  if (tags.length === 0) {
    elements.tagFilters.innerHTML = '<span class="tag-pill">No tags yet</span>';
    return;
  }

  for (const tag of tags) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip ${state.activeTags.has(tag) ? "active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      if (state.activeTags.has(tag)) {
        state.activeTags.delete(tag);
      } else {
        state.activeTags.add(tag);
      }
      renderTagFilters();
      renderCards();
    });
    elements.tagFilters.appendChild(button);
  }
}

function renderMetrics() {
  if (!state.data) {
    return;
  }

  const metrics = [`<span class="metric-chip">Total <span>${state.data.entries.length}</span></span>`];
  for (const field of state.data.fields) {
    const count = state.data.counts.byField[field.key] || 0;
    metrics.push(`<span class="metric-chip">${escapeHtml(field.label)} <span>${count}</span></span>`);
  }
  elements.heroMetrics.innerHTML = metrics.join("");
}

function wireEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCards();
  });

  elements.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.activeField = "all";
    state.activeTags.clear();
    elements.searchInput.value = "";
    renderFieldFilters();
    renderTagFilters();
    renderCards();
  });
}

async function initialize() {
  wireEvents();
  try {
    const response = await fetch("./data/entries.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load site data (${response.status})`);
    }

    state.data = await response.json();
    elements.generatedAt.textContent = `Index generated ${formatDate(state.data.generatedAt)}`;

    renderMetrics();
    renderFieldFilters();
    renderTagFilters();
    renderCards();
  } catch (error) {
    elements.generatedAt.textContent = "Unable to load data index.";
    elements.cardsGrid.innerHTML =
      `<div class="empty-state">${escapeHtml(error.message)}. Run <code>node scripts/build-site-data.mjs</code> and serve <code>site/</code>.</div>`;
  }
}

initialize();
