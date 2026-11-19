const starterFiles = [
  { name: "README.md", type: "markdown", content: "# WebSlate\n\n## Write. Build. Ship.\n\n**A calm, browser-based workspace for words, Markdown, notes, and code.**\n\n[Open WebSlate](https://snb220.github.io/WebSlate/index.html) · [GitHub](https://github.com/SNB220/WebSlate)\n\n---\n\n> Your ideas belong in a space that stays out of the way.\n\n## ✨ What you can do\n\n| Write | Build | Keep control |\n| --- | --- | --- |\n| Markdown preview, notes, tables, and task lists | JavaScript, CSS, plain text, and custom extensions | Browser persistence, imports, downloads, and no account required |\n\n### The workspace includes\n\n- **Explorer** — create, rename, import, close, and delete files\n- **Editor** — line numbers, cursor position, undo, redo, and keyboard shortcuts\n- **Markdown preview** — headings, lists, tables, links, quotes, dividers, and code blocks\n- **Search** — find a word across every file and jump to the matching line\n- **Themes** — switch between focused dark and light modes\n\n## 🚀 Get started\n\n1. Click the **+** button in Explorer.\n2. Enter a filename, such as `ideas.md` or `app.js`.\n3. Choose an extension and start writing.\n\n## ⌨️ Useful shortcuts\n\n| Action | Shortcut |\n| --- | --- |\n  | Undo | `Ctrl + Z` |\n| Redo | `Ctrl + Y` |\n| Quick Preview (Markdown) | `Ctrl + Shift + P` |\n| Save workspace | `Ctrl + S` |\n| Download current file | `Ctrl + Shift + S` |\n| Close active tab | `Ctrl + W` |\n| Confirm a filename | `Enter` |\n| Cancel a dialog | `Escape` |\n\n## 💾 Private by design\n\nWebSlate stores workspace files in your browser's local storage. Your writing is not uploaded by the app. Import files locally, edit them, and download your finished work whenever you are ready.\n\n## Made by SNB\n\nCreated and maintained by [SNB220](https://github.com/SNB220). If WebSlate helps your workflow, consider giving the project a ⭐ on [GitHub](https://github.com/SNB220/WebSlate)." },
  { name: "index.js", type: "javascript", content: "const webSlate = {\n  name: \"WebSlate\",\n  version: \"1.0.0\",\n  tagline: \"Write. Build. Ship.\"\n};\n\nfunction openWorkspace() {\n  console.log(`Welcome to ${webSlate.name}`);\n}\n\nopenWorkspace();" },
  { name: "styles.css", type: "css", content: ":root {\n  --webslate-green: #42b883;\n  --webslate-ink: #0d1117;\n}\n\n.editor {\n  color: #dce5ed;\n  background: var(--webslate-ink);\n}" },
  { name: "notes.txt", type: "text", content: "A blank page is an invitation.\n\nCapture the thought before it disappears." }
];

const STORAGE_KEY = "slate-workspace-v1";
const WELCOME_KEY = "slate-welcome-seen-v1";
const THEME_KEY = "slate-theme-v1";
let files = starterFiles;
let folders = [];
let activeIndex = 0;
let openTabs = files.map((_, index) => index);
let previewing = false;
let splitMode = false;
const dirtyFiles = new Set();
const editHistory = new Map();
let restoringHistory = false;
const editor = document.getElementById("editor");
const lineNumbers = document.getElementById("lineNumbers");
const fileTree = document.getElementById("fileTree");
const tabs = document.getElementById("tabs");
const breadcrumbs = document.getElementById("breadcrumbs");
const markdownPreview = document.getElementById("markdownPreview");
const editorWrap = document.querySelector(".editor-wrap");
const editorPane = document.getElementById("editorPane");
const splitButton = document.getElementById("splitButton");
const languageStatus = document.getElementById("languageStatus");
const cursorPosition = document.getElementById("cursorPosition");
const toast = document.getElementById("toast");
const themeButton = document.getElementById("themeButton");
const closeModal = document.getElementById("closeModal");
const closeModalMessage = document.getElementById("closeModalMessage");
const clearModal = document.getElementById("clearModal");
const clearModalMessage = document.getElementById("clearModalMessage");
const newFileButton = document.getElementById("newFileButton");
const newFileMenu = document.getElementById("newFileMenu");
const newFileName = document.getElementById("newFileName");
const newFileFolder = document.getElementById("newFileFolder");
const newFolderButton = document.getElementById("newFolderButton");
const customExtension = document.getElementById("customExtension");
const downloadModal = document.getElementById("downloadModal");
const downloadFileName = document.getElementById("downloadFileName");
const aboutModal = document.getElementById("aboutModal");
const sidebar = document.getElementById("sidebar");
const collapseSidebarButton = document.getElementById("collapseSidebarButton");
const reopenSidebarButton = document.getElementById("reopenSidebarButton");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const importActivityButton = document.getElementById("importActivityButton");
const importFileInput = document.getElementById("importFileInput");
const exportWorkspaceButton = document.getElementById("exportWorkspaceButton");
const importWorkspaceButton = document.getElementById("importWorkspaceButton");
const importWorkspaceInput = document.getElementById("importWorkspaceInput");
const searchActivityButton = document.getElementById("searchActivityButton");
const explorerContent = document.getElementById("explorerContent");
const searchView = document.getElementById("searchView");
const workspaceSearch = document.getElementById("workspaceSearch");
const searchSummary = document.getElementById("searchSummary");
const searchResults = document.getElementById("searchResults");
const saveStatus = document.getElementById("saveStatus");
const statusSaveState = document.getElementById("statusSaveState");
let pendingCloseIndex = -1;

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const lightMode = theme === "light";
  themeButton.title = lightMode ? "Switch to dark mode" : "Switch to light mode";
  themeButton.setAttribute("aria-label", themeButton.title);
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
}

applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
themeButton.addEventListener("click", toggleTheme);

function saveWorkspace(clearDirty = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    files,
    folders,
    openTabs,
    activeIndex
  }));
  if (clearDirty) dirtyFiles.clear();
  updateSaveStatus();
}

function exportWorkspace() {
  if (activeIndex >= 0) files[activeIndex].content = editor.value;
  const backup = {
    format: "webslate-workspace",
    version: 1,
    exportedAt: new Date().toISOString(),
    theme: document.body.dataset.theme,
    files,
    folders,
    openTabs,
    activeIndex
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `webslate-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    link.remove();
  }, 10000);
  saveWorkspace();
  showToast("Workspace exported");
}

function applyImportedWorkspace(backup) {
  if (!backup || backup.format !== "webslate-workspace" || backup.version !== 1 || !Array.isArray(backup.files) || !Array.isArray(backup.folders)) {
    throw new Error("Unsupported WebSlate backup");
  }
  const importedFolders = backup.folders.filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string")
    .map((folder) => ({ id: folder.id, name: folder.name, collapsed: Boolean(folder.collapsed) }));
  const folderIds = new Set(importedFolders.map((folder) => folder.id));
  const importedFiles = backup.files.filter((file) => file && typeof file.name === "string" && typeof file.content === "string")
    .map((file) => ({
      name: file.name,
      type: ["markdown", "javascript", "css", "text"].includes(file.type) ? file.type : typeForExtension(extensionForFilename(file.name)),
      content: file.content,
      folderId: folderIds.has(file.folderId) ? file.folderId : "",
      pinned: Boolean(file.pinned)
    }));
  if (!importedFiles.length) throw new Error("Backup contains no files");
  files = importedFiles;
  folders = importedFolders;
  openTabs = Array.isArray(backup.openTabs) ? backup.openTabs.filter((index) => Number.isInteger(index) && index >= 0 && index < files.length) : files.map((_, index) => index);
  activeIndex = Number.isInteger(backup.activeIndex) && backup.activeIndex >= 0 && backup.activeIndex < files.length ? backup.activeIndex : 0;
  dirtyFiles.clear();
  editHistory.clear();
  files.forEach((file, index) => editHistory.set(index, { entries: [file.content], position: 0, lastEditAt: 0 }));
  applyTheme(backup.theme === "light" ? "light" : "dark");
  localStorage.setItem(THEME_KEY, document.body.dataset.theme);
  editor.value = files[activeIndex].content;
  previewing = false;
  splitMode = false;
  markdownPreview.classList.add("hidden");
  editorWrap.classList.remove("split-mode");
  document.getElementById("editorPane").classList.remove("hidden");
  document.getElementById("previewButton").innerHTML = '<span class="preview-dot"></span> Preview';
  renderChrome();
  updateLines();
  updateCursor();
  updateHistoryButtons();
  saveWorkspace(true);
}

async function importWorkspace(file) {
  if (!file) return;
  try {
    applyImportedWorkspace(JSON.parse(await file.text()));
    showToast("Workspace imported");
  } catch (error) {
    showToast(error.message === "Unsupported WebSlate backup" || error.message === "Backup contains no files" ? error.message : "Unable to read workspace backup");
  } finally {
    importWorkspaceInput.value = "";
  }
}

function updateSaveStatus() {
  const hasUnsavedChanges = dirtyFiles.size > 0;
  saveStatus.textContent = hasUnsavedChanges ? "Unsaved changes" : "All changes saved";
  saveStatus.parentElement.classList.toggle("unsaved", hasUnsavedChanges);
  statusSaveState.textContent = hasUnsavedChanges ? "Unsaved" : "Saved";
}

function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.files)) return;
    files = saved.files.filter((file) => file && typeof file.name === "string" && typeof file.content === "string");
    if (!files.length) files = starterFiles;
    folders = Array.isArray(saved.folders) ? saved.folders.filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string").map((folder) => ({ ...folder, collapsed: Boolean(folder.collapsed) })) : [];
    files = files.map((file) => ({ ...file, folderId: folders.some((folder) => folder.id === file.folderId) ? file.folderId : "", pinned: Boolean(file.pinned) }));
    const savedReadme = files.find((file) => file.name.toLowerCase() === "readme.md");
    if (savedReadme && savedReadme.content.startsWith("# Welcome to WebSlate\n\nA focused workspace")) {
      savedReadme.content = starterFiles[0].content;
    }
    openTabs = Array.isArray(saved.openTabs) ? saved.openTabs.filter((index) => Number.isInteger(index) && index >= 0 && index < files.length) : files.map((_, index) => index);
    activeIndex = Number.isInteger(saved.activeIndex) && saved.activeIndex >= 0 && saved.activeIndex < files.length ? saved.activeIndex : -1;
  } catch (error) {
    files = starterFiles;
    folders = [];
    openTabs = files.map((_, index) => index);
    activeIndex = 0;
  }
}

function iconFor(type) {
  return type === "markdown" ? "M" : type === "javascript" ? "JS" : type === "css" ? "#" : "·";
}

function typeForExtension(extension) {
  return extension === "md" ? "markdown" : extension === "js" ? "javascript" : extension === "css" ? "css" : "text";
}

function extensionForFilename(name) {
  const match = name.match(/\.([a-z0-9][a-z0-9_-]{0,11})$/i);
  return match ? match[1].toLowerCase() : "txt";
}

function renderChrome() {
  const folderGroups = [{ id: "", name: "Workspace", collapsed: false }, ...folders];
  fileTree.innerHTML = folderGroups.map((folder) => {
    const indexes = files.map((file, index) => ({ file, index }))
      .filter(({ file }) => (file.folderId || "") === folder.id)
      .sort((a, b) => Number(b.file.pinned) - Number(a.file.pinned));
    if (!indexes.length && folder.id) {
      return `<div class="folder-group"><button class="folder-heading" data-folder-id="${escapeHtml(folder.id)}" data-collapsed="${folder.collapsed}" aria-expanded="${!folder.collapsed}"><span class="folder-chevron">${folder.collapsed ? "›" : "⌄"}</span><span class="folder-symbol">□</span><span>${escapeHtml(folder.name)}</span></button></div>`;
    }
    return `<div class="folder-group">
      ${folder.id ? `<button class="folder-heading" data-folder-id="${escapeHtml(folder.id)}" data-collapsed="${folder.collapsed}" aria-expanded="${!folder.collapsed}"><span class="folder-chevron">${folder.collapsed ? "›" : "⌄"}</span><span class="folder-symbol">□</span><span>${escapeHtml(folder.name)}</span></button>` : ""}
      <div class="folder-files ${folder.collapsed ? "hidden" : ""}" data-folder-id="${escapeHtml(folder.id)}">
        ${indexes.map(({ file, index }) => `<button class="file-item ${index === activeIndex ? "active" : ""}" draggable="true" data-index="${index}">
          <span class="file-icon ${file.type}">${iconFor(file.type)}</span><span class="file-name">${escapeHtml(file.name)}</span><span class="pin-toggle ${file.pinned ? "pinned" : ""}" role="button" tabindex="0" data-pin-index="${index}" aria-label="${file.pinned ? "Unpin" : "Pin"} ${escapeHtml(file.name)}">${file.pinned ? "★" : "☆"}</span>
        </button>`).join("")}
      </div>
    </div>`;
  }).join("");
  newFileFolder.innerHTML = `<option value="">Workspace root</option>${folders.map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`).join("")}`;
  tabs.innerHTML = openTabs.map((fileIndex) => {
    const file = files[fileIndex];
    return `
    <div class="tab ${fileIndex === activeIndex ? "active" : ""}" role="tab" tabindex="0" aria-selected="${fileIndex === activeIndex}" aria-label="${escapeHtml(file.name)} tab">
      <span class="file-icon ${file.type}">${iconFor(file.type)}</span><span class="file-name">${file.name}</span>${dirtyFiles.has(fileIndex) ? '<span class="tab-unsaved" aria-label="Unsaved changes">●</span>' : ""}
      <button class="close" data-close="${fileIndex}" aria-label="Close ${file.name}">×</button>
    </div>`;
  }).join("");
  fileTree.querySelectorAll(".file-item").forEach((item) => {
    item.addEventListener("click", () => openFile(Number(item.dataset.index)));
    item.addEventListener("dblclick", () => beginRename(Number(item.dataset.index), item));
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.index);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      moveFile(Number(event.dataTransfer.getData("text/plain")), Number(item.dataset.index));
    });
  });
  fileTree.querySelectorAll(".folder-heading").forEach((heading) => {
    heading.addEventListener("click", () => {
      const folder = folders.find((entry) => entry.id === heading.dataset.folderId);
      if (!folder) return;
      folder.collapsed = !folder.collapsed;
      renderChrome();
      saveWorkspace();
    });
    heading.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    heading.addEventListener("drop", (event) => {
      event.preventDefault();
      moveFileToFolder(Number(event.dataTransfer.getData("text/plain")), heading.dataset.folderId);
    });
  });
  fileTree.querySelectorAll(".pin-toggle").forEach((pin) => {
    const togglePin = (event) => {
      event.stopPropagation();
      const index = Number(pin.dataset.pinIndex);
      files[index].pinned = !files[index].pinned;
      renderChrome();
      saveWorkspace();
    };
    pin.addEventListener("click", togglePin);
    pin.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePin(event);
      }
    });
  });
  tabs.querySelectorAll(".close").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeTab(Number(button.dataset.close));
  }));
  tabs.querySelectorAll(".tab").forEach((tab) => {
    const openTab = () => openFile(Number(tab.querySelector(".close").dataset.close));
    tab.addEventListener("click", openTab);
    tab.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTab();
      }

    });
  });
  const current = files[activeIndex];
  breadcrumbs.innerHTML = current ? `<span>workspace</span><span>›</span><strong>${current.name}</strong>` : "<span>No file open</span>";
  languageStatus.textContent = current ? (current.type === "markdown" ? "Markdown" : current.type === "javascript" ? "JavaScript" : current.type === "css" ? "CSS" : "Plain Text") : "Plain Text";
  updateSaveStatus();
}

function remapReferences(map) {
  openTabs = openTabs.map((index) => map[index]).filter((index) => Number.isInteger(index));
  activeIndex = activeIndex >= 0 ? map[activeIndex] : -1;
  const nextDirty = new Set();
  dirtyFiles.forEach((index) => { if (Number.isInteger(map[index])) nextDirty.add(map[index]); });
  dirtyFiles.clear();
  nextDirty.forEach((index) => dirtyFiles.add(index));
  const nextHistory = new Map();
  editHistory.forEach((history, index) => { if (Number.isInteger(map[index])) nextHistory.set(map[index], history); });
  editHistory.clear();
  nextHistory.forEach((history, index) => editHistory.set(index, history));
}

function moveFile(fromIndex, targetIndex) {
  if (fromIndex === targetIndex || !files[fromIndex] || !files[targetIndex]) return;
  const movedFile = files[fromIndex];
  const targetFolderId = files[targetIndex].folderId || "";
  const reordered = files.filter((_, index) => index !== fromIndex);
  const insertAt = reordered.indexOf(files[targetIndex]);
  movedFile.folderId = targetFolderId;
  reordered.splice(insertAt, 0, movedFile);
  const map = [];
  files.forEach((file, index) => { map[index] = reordered.indexOf(file); });
  files = reordered;
  remapReferences(map);
  renderChrome();
  saveWorkspace();
}

function moveFileToFolder(fileIndex, folderId) {
  if (!files[fileIndex] || (files[fileIndex].folderId || "") === folderId) return;
  files[fileIndex].folderId = folderId;
  renderChrome();
  saveWorkspace();
  showToast(`Moved ${files[fileIndex].name}`);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function renderSearchResults(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    searchSummary.textContent = "Search all files in your workspace";
    searchResults.innerHTML = "";
    return;
  }
  const matches = [];
  files.forEach((file, fileIndex) => {
    file.content.split("\n").forEach((line, lineIndex) => {
      if (line.toLowerCase().includes(normalizedQuery)) matches.push({ fileIndex, lineIndex, line });
    });
  });
  searchSummary.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? "match" : "matches"} in ${new Set(matches.map((match) => match.fileIndex)).size} files` : "No matches found";
  searchResults.innerHTML = matches.map((match) => {
    const escapedLine = escapeHtml(match.line.trim() || "(empty line)");
    const highlightedLine = escapedLine.replace(new RegExp(`(${escapeHtml(query.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>");
    return `<button class="search-result" data-file-index="${match.fileIndex}" data-line="${match.lineIndex}">
      <span class="search-result-file"><span class="file-icon ${files[match.fileIndex].type}">${iconFor(files[match.fileIndex].type)}</span>${escapeHtml(files[match.fileIndex].name)}<span class="search-result-count">Ln ${match.lineIndex + 1}</span></span>
      <span class="search-result-match">${highlightedLine}</span>
    </button>`;
  }).join("");
  searchResults.querySelectorAll(".search-result").forEach((result) => result.addEventListener("click", () => {
    const fileIndex = Number(result.dataset.fileIndex);
    const lineIndex = Number(result.dataset.line);
    openFile(fileIndex);
    const position = editor.value.split("\n").slice(0, lineIndex).join("\n").length + (lineIndex ? 1 : 0);
    editor.focus();
    editor.setSelectionRange(position, position + editor.value.split("\n")[lineIndex].length);
    updateCursor();
  }));
}

function showSearchView() {
  setSidebarCollapsed(false);
  explorerContent.classList.add("hidden");
  fileTree.classList.add("hidden");
  searchView.classList.remove("hidden");
  searchActivityButton.classList.add("active");
  workspaceSearch.focus();
}

function showExplorerView() {
  explorerContent.classList.remove("hidden");
  fileTree.classList.remove("hidden");
  searchView.classList.add("hidden");
  searchActivityButton.classList.remove("active");
}

async function importFiles(selectedFiles) {
  if (!selectedFiles.length) return;
  try {
    const imported = await Promise.all(Array.from(selectedFiles).map(async (file) => ({
      name: file.name,
      type: typeForExtension(extensionForFilename(file.name)),
      content: await file.text()
    })));
    let lastImportedIndex = -1;
    imported.forEach((importedFile) => {
      const existingIndex = files.findIndex((file) => file.name.toLowerCase() === importedFile.name.toLowerCase());
      if (existingIndex >= 0) {
        files[existingIndex] = importedFile;
        dirtyFiles.delete(existingIndex);
        lastImportedIndex = existingIndex;
      } else {
        files.push(importedFile);
        lastImportedIndex = files.length - 1;
      }
    });
    showExplorerView();
    if (lastImportedIndex >= 0) openFile(lastImportedIndex);
    saveWorkspace();
    showToast(`${imported.length} ${imported.length === 1 ? "file" : "files"} imported`);
  } catch (error) {
    showToast("Unable to import the selected file");
  } finally {
    importFileInput.value = "";
  }
}

function updateLines() {
  const count = Math.max(1, editor.value.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: count }, (_, index) => index + 1).join("<br>");
  syncLineNumbers();
}

function historyFor(index) {
  if (!editHistory.has(index)) editHistory.set(index, { entries: [files[index]?.content || ""], position: 0, lastEditAt: 0 });
  return editHistory.get(index);
}

function updateHistoryButtons() {
  const history = activeIndex >= 0 ? historyFor(activeIndex) : { position: 0, entries: [""] };
  undoButton.disabled = history.position === 0;
  redoButton.disabled = history.position >= history.entries.length - 1;
}

function recordEdit() {
  if (activeIndex < 0 || restoringHistory) return;
  const history = historyFor(activeIndex);
  const currentValue = editor.value;
  if (history.entries[history.position] === currentValue) return;
  const now = Date.now();
  if (now - history.lastEditAt < 500) {
    history.entries[history.position] = currentValue;
  } else {
    history.entries = history.entries.slice(0, history.position + 1);
    history.entries.push(currentValue);
    history.position += 1;
  }
  history.lastEditAt = now;
  updateHistoryButtons();
}

function restoreHistory(direction) {
  if (activeIndex < 0) return;
  const history = historyFor(activeIndex);
  const nextPosition = history.position + direction;
  if (nextPosition < 0 || nextPosition >= history.entries.length) return;
  history.position = nextPosition;
  history.lastEditAt = 0;
  restoringHistory = true;
  editor.value = history.entries[history.position];
  files[activeIndex].content = editor.value;
  dirtyFiles.add(activeIndex);
  restoringHistory = false;
  updateLines();
  updateCursor();
  if (previewing || splitMode) markdownPreview.innerHTML = markdownToHtml(editor.value);
  updateHistoryButtons();
  saveWorkspace();
}

function syncLineNumbers() {
  lineNumbers.scrollTop = editor.scrollTop;
}

function openFile(index) {
  if (index === activeIndex && editor.value === files[index].content) return;
  if (activeIndex >= 0) files[activeIndex].content = editor.value;
  if (!openTabs.includes(index)) openTabs.push(index);
  activeIndex = index;
  editor.value = files[index].content;
  editor.scrollTop = 0;
  previewing = false;
  splitMode = false;
  markdownPreview.classList.add("hidden");
  editorWrap.classList.remove("split-mode");
  splitButton.classList.toggle("hidden", files[index].type !== "markdown");
  document.getElementById("editorPane").classList.remove("hidden");
  document.getElementById("previewButton").innerHTML = '<span class="preview-dot"></span> Preview';
  renderChrome();
  updateLines();
  updateHistoryButtons();
  editor.focus();
  saveWorkspace();
}

function closeTab(fileIndex) {
  const tabPosition = openTabs.indexOf(fileIndex);
  if (tabPosition < 0) return;
  if (activeIndex >= 0) files[activeIndex].content = editor.value;
  pendingCloseIndex = fileIndex;
  closeModalMessage.textContent = `Choose what to do with "${files[fileIndex].name}". Saving closes the tab but keeps the file in Explorer.`;
  closeModal.classList.remove("hidden");
  document.getElementById("saveFileButton").focus();
}

function finishCloseTab(fileIndex, shouldDelete) {
  const tabPosition = openTabs.indexOf(fileIndex);
  if (tabPosition < 0) return;
  openTabs.splice(tabPosition, 1);
  if (shouldDelete) {
    files.splice(fileIndex, 1);
    dirtyFiles.delete(fileIndex);
    [...dirtyFiles].forEach((index) => {
      if (index > fileIndex) {
        dirtyFiles.delete(index);
        dirtyFiles.add(index - 1);
      }
    });
    openTabs = openTabs.map((index) => index > fileIndex ? index - 1 : index);
  } else {
    dirtyFiles.delete(fileIndex);
  }
  if (activeIndex === fileIndex) {
    const nextFileIndex = openTabs[tabPosition] ?? openTabs[tabPosition - 1] ?? -1;
    activeIndex = nextFileIndex;
    previewing = false;
    markdownPreview.classList.add("hidden");
    document.getElementById("editorPane").classList.remove("hidden");
    document.getElementById("previewButton").innerHTML = '<span class="preview-dot"></span> Preview';
    editor.value = nextFileIndex >= 0 ? files[nextFileIndex].content : "";
    editor.scrollTop = 0;
    updateLines();
    updateCursor();
  } else if (shouldDelete && activeIndex > fileIndex) {
    activeIndex -= 1;
  }
  renderChrome();
  showToast(shouldDelete ? "File deleted" : "Tab closed; file saved in Explorer");
  saveWorkspace();
}

function beginRename(fileIndex, item) {
  const nameElement = item.querySelector(".file-name");
  const input = document.createElement("input");
  input.className = "rename-input";
  input.value = files[fileIndex].name;
  nameElement.replaceWith(input);
  input.focus();
  input.select();
  const finish = (save) => {
    if (save) {
      const nextName = input.value.trim();
      if (nextName) files[fileIndex].name = nextName;
    }
    renderChrome();
    saveWorkspace();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") finish(true);
    if (event.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true), { once: true });
}

function updateCursor() {
  const before = editor.value.slice(0, editor.selectionStart);
  const line = before.split("\n").length;
  const col = before.length - before.lastIndexOf("\n");
  cursorPosition.textContent = `Ln ${line}, Col ${col}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setSidebarCollapsed(collapsed) {
  sidebar.classList.toggle("hidden", collapsed);
  reopenSidebarButton.classList.toggle("hidden", !collapsed);
  collapseSidebarButton.setAttribute("aria-label", collapsed ? "Collapse Explorer" : "Collapse Explorer");
}

collapseSidebarButton.addEventListener("click", () => setSidebarCollapsed(true));
reopenSidebarButton.addEventListener("click", () => setSidebarCollapsed(false));
document.querySelector(".activity-item[title='Explorer']").addEventListener("click", showExplorerView);
searchActivityButton.addEventListener("click", showSearchView);
workspaceSearch.addEventListener("input", () => renderSearchResults(workspaceSearch.value));
importActivityButton.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", () => importFiles(importFileInput.files));
exportWorkspaceButton.addEventListener("click", exportWorkspace);
importWorkspaceButton.addEventListener("click", () => importWorkspaceInput.click());
importWorkspaceInput.addEventListener("change", () => importWorkspace(importWorkspaceInput.files[0]));

function markdownToHtml(markdown) {
  const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const slugify = (value) => value.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  const highlightCode = (value, language) => {
    let result = escape(value);
    if (!["js", "javascript", "css", "html", "xml", "json"].includes(language.toLowerCase())) return result;
    result = result.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|".*?"|'.*?')/g, '<span class="code-string">$1</span>');
    result = result.replace(/(\/\/.*|\/\*.*?\*\/|<!--.*?-->)/g, '<span class="code-comment">$1</span>');
    result = result.replace(/\b(const|let|var|function|return|if|else|for|while|new|class|import|from|true|false|null)\b/g, '<span class="code-keyword">$1</span>');
    return result;
  };
  const footnotes = new Map();
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n").filter((line) => {
    const definition = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (!definition) return true;
    footnotes.set(definition[1], definition[2]);
    return false;
  });
  const headings = lines.map((line) => line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)).filter(Boolean).map((heading) => ({
    level: heading[1].length,
    text: heading[2],
    id: slugify(heading[2])
  }));
  const usedFootnotes = [];
  const inlineMarkup = (value) => {
    let result = escape(value);
    result = result.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/[^)\s]+|#[^)\s]+)\)/g, '<img src="$2" alt="$1">');
    result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|\/[^)\s]+|#[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
    result = result.replace(/\*\*(.*?)\*\*|__(.*?)__/g, (_, bold, underlined) => `<strong>${bold || underlined}</strong>`);
    result = result.replace(/~~(.*?)~~/g, "<del>$1</del>");
    result = result.replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, (_, italic, underscored) => `<em>${italic || underscored}</em>`);
    result = result.replace(/\[\^([^\]]+)\]/g, (_, id) => {
      if (!footnotes.has(id)) return `[^${id}]`;
      if (!usedFootnotes.includes(id)) usedFootnotes.push(id);
      return `<sup class="footnote-ref" id="fnref-${id}"><a href="#fn-${id}">[${usedFootnotes.indexOf(id) + 1}]</a></sup>`;
    });
    return result;
  };
  const output = [];
  let index = 0;
  const isTableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const splitTableRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const alignmentFor = (separator) => separator.startsWith(":") && separator.endsWith(":") ? "center" : separator.startsWith(":") ? "left" : separator.endsWith(":") ? "right" : "";
  const flushParagraph = (paragraph) => {
    if (paragraph.length) output.push(`<p>${inlineMarkup(paragraph.join("\n")).replace(/\n/g, "<br>")}</p>`);
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (/^\s*\[\[toc\]\]\s*$/i.test(line)) {
      output.push(`<nav class="toc" aria-label="Table of contents"><div class="toc-title">Table of contents</div><ul>${headings.map((heading) => `<li style="margin-left:${(heading.level - 1) * 14}px"><a href="#${heading.id}">${inlineMarkup(heading.text)}</a></li>`).join("")}</ul></nav>`);
      index += 1;
      continue;
    }
    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3).trim();
      index += 1;
      const code = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      const languageLabel = language ? `<span class="code-language">${escape(language)}</span>` : "";
      output.push(`<pre${language ? ` data-language="${escape(language)}"` : ""}>${languageLabel}<button class="code-copy" type="button">Copy</button><code>${highlightCode(code.join("\n"), language)}</code></pre>`);
      continue;
    }
    if (index + 1 < lines.length && line.includes("|") && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      const separators = splitTableRow(lines[index + 1]);
      index += 2;
      const body = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) body.push(splitTableRow(lines[index++]));
      const cell = (tag, value, column) => {
        const alignment = alignmentFor(separators[column] || "");
        return `<${tag}${alignment ? ` style="text-align:${alignment}"` : ""}>${inlineMarkup(value || "")}</${tag}>`;
      };
      output.push(`<table><thead><tr>${headers.map((header, column) => cell("th", header, column)).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${headers.map((_, column) => cell("td", row[column], column)).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { output.push("<hr>"); index += 1; continue; }
    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) { output.push(`<h${heading[1].length} id="${slugify(heading[2])}">${inlineMarkup(heading[2])}</h${heading[1].length}>`); index += 1; continue; }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      output.push(`<blockquote>${inlineMarkup(quote.join("\n")).replace(/\n/g, "<br>")}</blockquote>`);
      continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (index < lines.length && new RegExp(`^\\s*${ordered ? "\\d+\\." : "[-*+]"}\\s+`).test(lines[index])) {
        const item = lines[index++].replace(new RegExp(`^\\s*${ordered ? "\\d+\\." : "[-*+]"}\\s+`), "");
        const task = item.match(/^\[([ xX])\]\s+(.*)$/);
        items.push(task ? `<li class="task-item"><input type="checkbox" disabled ${task[1].toLowerCase() === "x" ? "checked" : ""}>${inlineMarkup(task[2])}</li>` : `<li>${inlineMarkup(item)}</li>`);
      }
      output.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^\s*(?:```|#{1,6}\s|>|[-*+]\s+|\d+\.\s+|---+$|\*\*\*+$|___+$)/.test(lines[index])) paragraph.push(lines[index++]);
    flushParagraph(paragraph);
  }
  if (usedFootnotes.length) {
    output.push(`<section class="footnotes"><ol>${usedFootnotes.map((id) => `<li id="fn-${id}">${inlineMarkup(footnotes.get(id))} <a class="footnote-backref" href="#fnref-${id}" aria-label="Back to reference">↩</a></li>`).join("")}</ol></section>`);
  }
  return output.join("");
}

editor.addEventListener("input", () => {
  if (activeIndex < 0) return;
  files[activeIndex].content = editor.value;
  dirtyFiles.add(activeIndex);
  updateLines();
  updateCursor();
  if (previewing || splitMode) markdownPreview.innerHTML = markdownToHtml(editor.value);
  recordEdit();
  renderChrome();
  saveWorkspace();
});
editor.addEventListener("click", updateCursor);
editor.addEventListener("keyup", updateCursor);
editor.addEventListener("scroll", syncLineNumbers);

markdownPreview.addEventListener("click", async (event) => {
  const copyButton = event.target.closest(".code-copy");
  if (!copyButton) return;
  const code = copyButton.parentElement.querySelector("code").textContent;
  try {
    await navigator.clipboard.writeText(code);
    copyButton.textContent = "Copied";
    setTimeout(() => { copyButton.textContent = "Copy"; }, 1200);
  } catch (error) {
    showToast("Unable to copy code");
  }
});

undoButton.addEventListener("click", () => restoreHistory(-1));
redoButton.addEventListener("click", () => restoreHistory(1));
document.getElementById("clearButton").addEventListener("click", () => {
  if (activeIndex < 0) { showToast("Open a file to clear it"); return; }
  if (!editor.value) { showToast("The current file is already empty"); return; }
  clearModalMessage.textContent = `This will remove all content from "${files[activeIndex].name}". You can undo this action afterward.`;
  clearModal.classList.remove("hidden");
  document.getElementById("cancelClearButton").focus();
});
document.getElementById("cancelClearButton").addEventListener("click", () => clearModal.classList.add("hidden"));
document.getElementById("confirmClearButton").addEventListener("click", () => {
  if (activeIndex < 0) return;
  historyFor(activeIndex).lastEditAt = 0;
  editor.value = "";
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  clearModal.classList.add("hidden");
  showToast("File content cleared");
  editor.focus();
});
clearModal.addEventListener("click", (event) => {
  if (event.target === clearModal) clearModal.classList.add("hidden");
});

function togglePreview() {
  if (activeIndex < 0) { showToast("Open a file to preview it"); return; }
  if (files[activeIndex].type !== "markdown") { showToast("Preview is available for Markdown files"); return; }
  splitMode = false;
  editorWrap.classList.remove("split-mode");
  previewing = !previewing;
  markdownPreview.classList.toggle("hidden", !previewing);
  document.getElementById("editorPane").classList.toggle("hidden", previewing);
  document.getElementById("previewButton").innerHTML = previewing ? '<span class="preview-dot on"></span> Editor' : '<span class="preview-dot"></span> Preview';
  if (previewing) markdownPreview.innerHTML = markdownToHtml(editor.value);
}

document.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier || event.altKey) return;
  if (activeIndex < 0) return;
  const key = event.key.toLowerCase();
  if (key === "p" && event.shiftKey) {
    event.preventDefault();
    togglePreview();
  } else if (key === "s" && event.shiftKey) {
    event.preventDefault();
    document.getElementById("downloadButton").click();
  } else if (key === "s") {
    event.preventDefault();
    files[activeIndex].content = editor.value;
    saveWorkspace(true);
    renderChrome();
    showToast("All changes saved");
  } else if (key === "w") {
    event.preventDefault();
    closeTab(activeIndex);
  } else if (key === "z") {
    event.preventDefault();
    restoreHistory(event.shiftKey ? 1 : -1);
  } else if (key === "y") {
    event.preventDefault();
    restoreHistory(1);
  }
});

document.getElementById("previewButton").addEventListener("click", togglePreview);
splitButton.addEventListener("click", () => {
  if (activeIndex < 0 || files[activeIndex].type !== "markdown") return;
  splitMode = !splitMode;
  previewing = false;
  editorWrap.classList.toggle("split-mode", splitMode);
  editorPane.classList.remove("hidden");
  markdownPreview.classList.toggle("hidden", !splitMode);
  splitButton.innerHTML = splitMode ? '<span class="preview-dot on"></span> Split' : '<span class="preview-dot"></span> Split';
  document.getElementById("previewButton").innerHTML = '<span class="preview-dot"></span> Preview';
  if (splitMode) markdownPreview.innerHTML = markdownToHtml(editor.value);
});

document.getElementById("downloadButton").addEventListener("click", () => {
  if (activeIndex < 0) { showToast("Open a file to download it"); return; }
  files[activeIndex].content = editor.value;
  downloadFileName.value = files[activeIndex].name;
  downloadModal.classList.remove("hidden");
  downloadFileName.focus();
  downloadFileName.select();
});

function downloadActiveFile() {
  const enteredName = downloadFileName.value.trim();
  if (!enteredName || /[\\/:*?"<>|]/.test(enteredName)) {
    showToast("Enter a valid download filename");
    downloadFileName.focus();
    return;
  }
  const currentName = files[activeIndex].name;
  const currentExtension = currentName.includes(".") ? currentName.slice(currentName.lastIndexOf(".")) : "";
  const downloadName = enteredName.includes(".") ? enteredName : `${enteredName}${currentExtension}`;
  const extension = downloadName.includes(".") ? downloadName.slice(downloadName.lastIndexOf(".")).toLowerCase() : "";
  const mimeType = extension === ".md" ? "text/markdown;charset=utf-8" : "application/octet-stream";
  const blob = new Blob([editor.value], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = downloadName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    link.remove();
  }, 10000);
  saveWorkspace();
  downloadModal.classList.add("hidden");
  showToast(`${downloadName} downloaded`);
}

document.getElementById("confirmDownloadButton").addEventListener("click", downloadActiveFile);
document.getElementById("cancelDownloadButton").addEventListener("click", () => downloadModal.classList.add("hidden"));
downloadFileName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") downloadActiveFile();
  if (event.key === "Escape") downloadModal.classList.add("hidden");
});
downloadModal.addEventListener("click", (event) => {
  if (event.target === downloadModal) downloadModal.classList.add("hidden");
});

function showAboutModal() {
  aboutModal.classList.remove("hidden");
  document.getElementById("closeAboutButton").focus();
}

function dismissAboutModal() {
  aboutModal.classList.add("hidden");
  localStorage.setItem(WELCOME_KEY, "true");
}

document.getElementById("helpButton").addEventListener("click", showAboutModal);
document.getElementById("closeAboutButton").addEventListener("click", dismissAboutModal);
aboutModal.addEventListener("click", (event) => {
  if (event.target === aboutModal) dismissAboutModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  dismissAboutModal();
  downloadModal.classList.add("hidden");
  closeModal.classList.add("hidden");
  clearModal.classList.add("hidden");
});

function createNewFile(extension) {
  const normalizedExtension = extension.replace(/^\./, "").trim().toLowerCase();
  const enteredName = newFileName.value.trim();
  if (!enteredName || /[\\/:*?"<>|]/.test(enteredName)) {
    showToast("Enter a valid file name");
    newFileName.focus();
    return;
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,11}$/.test(normalizedExtension)) {
    showToast("Enter a valid extension, like json or py");
    customExtension.focus();
    return;
  }
  const enteredExtensionMatch = enteredName.match(/\.([a-z0-9][a-z0-9_-]{0,11})$/i);
  const fileExtension = enteredExtensionMatch ? enteredExtensionMatch[1].toLowerCase() : normalizedExtension;
  const baseName = enteredExtensionMatch ? enteredName.slice(0, -enteredExtensionMatch[0].length) : enteredName;
  if (!baseName) {
    showToast("Enter a file name before the extension");
    newFileName.focus();
    return;
  }
  const type = typeForExtension(fileExtension);
  const content = type === "markdown" ? "# Untitled\n\nStart writing here..." : "";
  const name = `${baseName}.${fileExtension}`;
  if (files.some((file) => file.name.toLowerCase() === name.toLowerCase())) {
    showToast("A file with that name already exists");
    newFileName.focus();
    return;
  }
  files.push({ name, type, content, folderId: newFileFolder.value, pinned: false });
  openFile(files.length - 1);
  saveWorkspace();
  newFileName.value = "untitled";
  customExtension.value = "";
  newFileMenu.classList.add("hidden");
  newFileButton.setAttribute("aria-expanded", "false");
}

function createNewFolder() {
  const name = window.prompt("Folder name");
  if (name === null) return;
  const normalizedName = name.trim();
  if (!normalizedName || /[\\/:*?"<>|]/.test(normalizedName)) {
    showToast("Enter a valid folder name");
    return;
  }
  if (folders.some((folder) => folder.name.toLowerCase() === normalizedName.toLowerCase())) {
    showToast("A folder with that name already exists");
    return;
  }
  folders.push({ id: `folder-${Date.now()}`, name: normalizedName, collapsed: false });
  renderChrome();
  saveWorkspace();
  showToast(`${normalizedName} folder created`);
}

newFileButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const isHidden = newFileMenu.classList.toggle("hidden");
  newFileButton.setAttribute("aria-expanded", String(!isHidden));
  if (!isHidden) {
    newFileName.focus();
    newFileName.select();
  }
});
newFolderButton.addEventListener("click", createNewFolder);
newFileMenu.querySelectorAll(".file-type-option").forEach((option) => option.addEventListener("click", () => {
  createNewFile(option.dataset.extension);
}));
document.getElementById("createCustomFile").addEventListener("click", () => createNewFile(customExtension.value));
customExtension.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createNewFile(customExtension.value);
});
newFileName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") newFileMenu.querySelector(".file-type-option[data-extension='md']").click();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".new-file-control")) {
    newFileMenu.classList.add("hidden");
    newFileButton.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("cancelCloseButton").addEventListener("click", () => {
  pendingCloseIndex = -1;
  closeModal.classList.add("hidden");
});
document.getElementById("saveFileButton").addEventListener("click", () => {
  if (pendingCloseIndex >= 0) finishCloseTab(pendingCloseIndex, false);
  pendingCloseIndex = -1;
  closeModal.classList.add("hidden");
});
document.getElementById("deleteFileButton").addEventListener("click", () => {
  if (pendingCloseIndex >= 0) finishCloseTab(pendingCloseIndex, true);
  pendingCloseIndex = -1;
  closeModal.classList.add("hidden");
});
closeModal.addEventListener("click", (event) => {
  if (event.target === closeModal) document.getElementById("cancelCloseButton").click();
});

document.getElementById("searchButton").addEventListener("click", showSearchView);

editor.value = files[activeIndex].content;
loadWorkspace();
editor.value = activeIndex >= 0 ? files[activeIndex].content : "";
files.forEach((file, index) => editHistory.set(index, { entries: [file.content], position: 0, lastEditAt: 0 }));
renderChrome();
updateLines();
updateCursor();
updateHistoryButtons();
splitButton.classList.toggle("hidden", activeIndex < 0 || files[activeIndex].type !== "markdown");
if (!localStorage.getItem(WELCOME_KEY)) showAboutModal();
