const starterFiles = [
  { name: "README.md", type: "markdown", content: "# Welcome to WebSlate\n\nA focused workspace for **writing**, **editing**, and **building**.\n\n## One calm place to think\n\nWebSlate keeps your words and your code close at hand, without the noise. Write in Markdown, sketch an idea, or open a source file and get to work.\n\n> Your workspace is yours. Everything stays in your browser.\n\n### Start anywhere\n\n- Create a new file with the **+** button\n- Switch between files from the explorer\n- Use **Preview** to see Markdown come to life\n- Download your work when it is ready" },
  { name: "index.js", type: "javascript", content: "const webSlate = {\n  name: \"WebSlate\",\n  version: \"1.0.0\",\n  tagline: \"Write. Build. Ship.\"\n};\n\nfunction openWorkspace() {\n  console.log(`Welcome to ${webSlate.name}`);\n}\n\nopenWorkspace();" },
  { name: "styles.css", type: "css", content: ":root {\n  --webslate-green: #42b883;\n  --webslate-ink: #0d1117;\n}\n\n.editor {\n  color: #dce5ed;\n  background: var(--webslate-ink);\n}" },
  { name: "notes.txt", type: "text", content: "A blank page is an invitation.\n\nCapture the thought before it disappears." }
];

const STORAGE_KEY = "slate-workspace-v1";
const WELCOME_KEY = "slate-welcome-seen-v1";
const THEME_KEY = "slate-theme-v1";
let files = starterFiles;
let activeIndex = 0;
let openTabs = files.map((_, index) => index);
let previewing = false;
const editor = document.getElementById("editor");
const lineNumbers = document.getElementById("lineNumbers");
const fileTree = document.getElementById("fileTree");
const tabs = document.getElementById("tabs");
const breadcrumbs = document.getElementById("breadcrumbs");
const markdownPreview = document.getElementById("markdownPreview");
const languageStatus = document.getElementById("languageStatus");
const cursorPosition = document.getElementById("cursorPosition");
const toast = document.getElementById("toast");
const themeButton = document.getElementById("themeButton");
const closeModal = document.getElementById("closeModal");
const closeModalMessage = document.getElementById("closeModalMessage");
const newFileButton = document.getElementById("newFileButton");
const newFileMenu = document.getElementById("newFileMenu");
const newFileName = document.getElementById("newFileName");
const customExtension = document.getElementById("customExtension");
const downloadModal = document.getElementById("downloadModal");
const downloadFileName = document.getElementById("downloadFileName");
const aboutModal = document.getElementById("aboutModal");
const sidebar = document.getElementById("sidebar");
const collapseSidebarButton = document.getElementById("collapseSidebarButton");
const reopenSidebarButton = document.getElementById("reopenSidebarButton");
const searchActivityButton = document.getElementById("searchActivityButton");
const explorerContent = document.getElementById("explorerContent");
const searchView = document.getElementById("searchView");
const workspaceSearch = document.getElementById("workspaceSearch");
const searchSummary = document.getElementById("searchSummary");
const searchResults = document.getElementById("searchResults");
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

function saveWorkspace() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    files,
    openTabs,
    activeIndex
  }));
}

function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.files)) return;
    files = saved.files.filter((file) => file && typeof file.name === "string" && typeof file.content === "string");
    if (!files.length) files = starterFiles;
    openTabs = Array.isArray(saved.openTabs) ? saved.openTabs.filter((index) => Number.isInteger(index) && index >= 0 && index < files.length) : files.map((_, index) => index);
    activeIndex = Number.isInteger(saved.activeIndex) && saved.activeIndex >= 0 && saved.activeIndex < files.length ? saved.activeIndex : -1;
  } catch (error) {
    files = starterFiles;
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

function renderChrome() {
  fileTree.innerHTML = files.map((file, index) => `
    <button class="file-item ${index === activeIndex ? "active" : ""}" data-index="${index}">
      <span class="file-icon ${file.type}">${iconFor(file.type)}</span><span class="file-name">${file.name}</span>
    </button>`).join("");
  tabs.innerHTML = openTabs.map((fileIndex) => {
    const file = files[fileIndex];
    return `
    <div class="tab ${fileIndex === activeIndex ? "active" : ""}">
      <span class="file-icon ${file.type}">${iconFor(file.type)}</span><span class="file-name">${file.name}</span>
      <button class="close" data-close="${fileIndex}" aria-label="Close ${file.name}">×</button>
    </div>`;
  }).join("");
  fileTree.querySelectorAll(".file-item").forEach((item) => {
    item.addEventListener("click", () => openFile(Number(item.dataset.index)));
    item.addEventListener("dblclick", () => beginRename(Number(item.dataset.index), item));
  });
  tabs.querySelectorAll(".close").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeTab(Number(button.dataset.close));
  }));
  tabs.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => openFile(Number(tab.querySelector(".close").dataset.close))));
  const current = files[activeIndex];
  breadcrumbs.innerHTML = current ? `<span>workspace</span><span>›</span><strong>${current.name}</strong>` : "<span>No file open</span>";
  languageStatus.textContent = current ? (current.type === "markdown" ? "Markdown" : current.type === "javascript" ? "JavaScript" : current.type === "css" ? "CSS" : "Plain Text") : "Plain Text";
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

function updateLines() {
  const count = Math.max(1, editor.value.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: count }, (_, index) => index + 1).join("<br>");
  syncLineNumbers();
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
  markdownPreview.classList.add("hidden");
  document.getElementById("editorPane").classList.remove("hidden");
  document.getElementById("previewButton").innerHTML = '<span class="preview-dot"></span> Preview';
  renderChrome();
  updateLines();
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
    openTabs = openTabs.map((index) => index > fileIndex ? index - 1 : index);
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

function markdownToHtml(markdown) {
  return markdown
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\- (.*)$/gm, "<li>$1</li>")
    .replace(/```([\s\S]*?)```/g, "<pre>$1</pre>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`)
    .split(/\n\n+/).map((block) => /^(<h|<ul|<pre|<blockquote)/.test(block) ? block : `<p>${block.replace(/\n/g, "<br>")}</p>`).join("");
}

editor.addEventListener("input", () => {
  if (activeIndex < 0) return;
  files[activeIndex].content = editor.value;
  updateLines();
  updateCursor();
  if (previewing) markdownPreview.innerHTML = markdownToHtml(editor.value);
  saveWorkspace();
});
editor.addEventListener("click", updateCursor);
editor.addEventListener("keyup", updateCursor);
editor.addEventListener("scroll", syncLineNumbers);

document.getElementById("previewButton").addEventListener("click", () => {
  if (activeIndex < 0) { showToast("Open a file to preview it"); return; }
  if (files[activeIndex].type !== "markdown") { showToast("Preview is available for Markdown files"); return; }
  previewing = !previewing;
  markdownPreview.classList.toggle("hidden", !previewing);
  document.getElementById("editorPane").classList.toggle("hidden", previewing);
  document.getElementById("previewButton").innerHTML = previewing ? '<span class="preview-dot on"></span> Editor' : '<span class="preview-dot"></span> Preview';
  if (previewing) markdownPreview.innerHTML = markdownToHtml(editor.value);
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
  files.push({ name, type, content });
  openFile(files.length - 1);
  saveWorkspace();
  newFileName.value = "untitled";
  customExtension.value = "";
  newFileMenu.classList.add("hidden");
  newFileButton.setAttribute("aria-expanded", "false");
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
renderChrome();
updateLines();
updateCursor();
if (!localStorage.getItem(WELCOME_KEY)) showAboutModal();
