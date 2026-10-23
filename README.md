# WebSlate

WebSlate is a focused, browser-based writing workspace inspired by Visual Studio Code. Write in Markdown, edit code, keep lightweight notes, and download your files when they are ready.

## Run locally

Open [WebSlate](https://snb220.github.io/WebSlate/index.html) in a browser. No build step or package installation is required.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Open the deployed Pages URL, then choose **Extensions** in WebSlate.
4. Drag the **WebSlate bookmarklet** button to your browser bookmarks bar, or copy its URL and create a bookmark manually.

After installation, click the bookmarklet from any page to open your personal WebSlate workspace in a new tab. Files are saved in that browser's local storage and are never uploaded.

## Included

- VS Code-inspired workspace layout
- File explorer with Markdown, JavaScript, CSS, and plain text examples
- Editable text area with line numbers and cursor position
- Markdown preview
- Workspace search
- New file creation
- Download the active file

Files are persisted in the browser with local storage. Downloads preserve the selected file extension, including JavaScript and CSS files on mobile browsers, and repeated downloads remain available after editing. WebSlate also includes a responsive mobile layout and a saved dark/light mode preference. The repository also includes a bookmarklet installation page and GitHub Pages deployment workflow.
