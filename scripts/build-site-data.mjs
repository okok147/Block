#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const fieldConfig = [
  { key: "solutions", label: "Solutions", dir: "knowledge/solutions" },
  { key: "algorithm", label: "Algorithm Patterns", dir: "knowledge/patterns/algorithms" },
  { key: "aesthetic", label: "Aesthetic/UI Patterns", dir: "knowledge/patterns/aesthetics" },
  { key: "checklist", label: "Checklists", dir: "knowledge/checklists" },
  { key: "template", label: "Templates", dir: "knowledge/templates" }
];

const outputPath = path.join(repoRoot, "site", "data", "entries.json");
const allowedMetaKeys = new Set(["Type", "Status", "Tags", "Date", "Domain"]);

function normalizeTitle(raw) {
  return raw
    .replace(/^\s*#\s*/, "")
    .replace(/^Solution:\s*/i, "")
    .replace(/^Pattern:\s*/i, "")
    .trim();
}

function parseListMeta(lines) {
  const meta = {};
  for (const line of lines) {
    const match = line.match(/^-\s+([^:]+):\s*(.+)$/);
    if (!match) {
      continue;
    }
    const key = match[1].trim();
    const value = match[2].trim();
    if (!allowedMetaKeys.has(key)) {
      continue;
    }
    meta[key] = value;
  }
  return meta;
}

function extractMetaBlock(lines) {
  const block = [];
  let seenTitle = false;

  for (const line of lines) {
    if (!seenTitle) {
      if (line.startsWith("# ")) {
        seenTitle = true;
      }
      continue;
    }

    if (line.startsWith("## ")) {
      break;
    }

    if (!line.trim()) {
      continue;
    }

    if (line.trim().startsWith("- ")) {
      block.push(line.trim());
      continue;
    }

    if (block.length > 0) {
      break;
    }
  }

  return block;
}

function parseSections(lines) {
  const sections = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        current.content = current.content.trim();
        sections.push(current);
      }
      current = {
        heading: headingMatch[1].trim(),
        content: ""
      };
      continue;
    }

    if (current) {
      current.content += `${line}\n`;
    }
  }

  if (current) {
    current.content = current.content.trim();
    sections.push(current);
  }

  return sections;
}

function firstPreviewParagraph(lines) {
  const skippedPrefixes = ["#", "##", "- Type:", "- Status:", "- Tags:", "- Date:", "- Domain:"];
  const candidates = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (candidates.length > 0) {
        break;
      }
      continue;
    }

    if (skippedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (candidates.length === 0) {
        candidates.push(trimmed.slice(2).trim());
      }
      continue;
    }

    candidates.push(trimmed);
  }

  return candidates.join(" ").slice(0, 240);
}

function parseTags(meta) {
  const raw = meta.Tags || "";
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag && !tag.includes("<") && !tag.includes(">"));
}

function extractPreviewFromSections(sections) {
  for (const section of sections) {
    const lines = section.content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("```")) {
        continue;
      }
      if (trimmed.startsWith("- ")) {
        return trimmed.slice(2).trim().slice(0, 240);
      }
      return trimmed.slice(0, 240);
    }
  }
  return "";
}

function toId(relativePath) {
  return relativePath.replace(/\.md$/, "").replace(/[\\/]/g, "--");
}

function normalizeRepoUrl(rawRemote) {
  if (!rawRemote) {
    return null;
  }

  const trimmed = rawRemote.trim();
  if (trimmed.startsWith("git@github.com:")) {
    const suffix = trimmed.replace("git@github.com:", "").replace(/\.git$/, "");
    return `https://github.com/${suffix}`;
  }

  if (trimmed.startsWith("https://github.com/")) {
    return trimmed.replace(/\.git$/, "");
  }

  if (trimmed.startsWith("ssh://git@github.com/")) {
    const suffix = trimmed.replace("ssh://git@github.com/", "").replace(/\.git$/, "");
    return `https://github.com/${suffix}`;
  }

  return null;
}

function detectRepoInfo() {
  try {
    const remote = execSync("git config --get remote.origin.url", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    });
    const repoUrl = normalizeRepoUrl(remote);
    if (!repoUrl) {
      return null;
    }
    return {
      repoUrl,
      blobBaseUrl: `${repoUrl}/blob/main`
    };
  } catch {
    return null;
  }
}

async function walkMarkdown(dirPath) {
  const entries = [];

  async function recurse(currentPath) {
    let dirEntries;
    try {
      dirEntries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of dirEntries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await recurse(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        entries.push(fullPath);
      }
    }
  }

  await recurse(dirPath);
  return entries;
}

async function parseEntry(filePath, field) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const headingLine = lines.find((line) => line.startsWith("# ")) || "# Untitled";
  const title = normalizeTitle(headingLine);
  const meta = parseListMeta(extractMetaBlock(lines));
  let sections = parseSections(lines);
  if (sections.length === 0) {
    const bodyLines = lines.filter((line) => !line.startsWith("# ")).join("\n").trim();
    if (bodyLines) {
      sections = [{ heading: "Details", content: bodyLines }];
    }
  }
  const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, "/");

  return {
    id: toId(relativePath),
    title,
    field,
    fieldLabel: fieldConfig.find((item) => item.key === field)?.label || field,
    relativePath,
    meta,
    tags: parseTags(meta),
    preview: firstPreviewParagraph(lines) || extractPreviewFromSections(sections) || `Reference entry for ${title}.`,
    sections,
    raw: content.trim()
  };
}

async function main() {
  const data = [];

  for (const config of fieldConfig) {
    const absDir = path.join(repoRoot, config.dir);
    const files = await walkMarkdown(absDir);
    for (const file of files) {
      data.push(await parseEntry(file, config.key));
    }
  }

  data.sort((a, b) => {
    if (a.field === b.field) {
      return a.title.localeCompare(b.title);
    }
    return a.field.localeCompare(b.field);
  });

  const allTags = [...new Set(data.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b));

  const payload = {
    generatedAt: new Date().toISOString(),
    repo: detectRepoInfo(),
    counts: {
      total: data.length,
      byField: fieldConfig.reduce((acc, field) => {
        acc[field.key] = data.filter((entry) => entry.field === field.key).length;
        return acc;
      }, {})
    },
    fields: fieldConfig,
    tags: allTags,
    entries: data
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const shortTime = payload.generatedAt.replace("T", " ").replace(".000Z", " UTC");
  console.log(`Generated ${path.relative(repoRoot, outputPath)} with ${data.length} entries at ${shortTime}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
