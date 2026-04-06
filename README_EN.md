# Folder Tagger

**Folder Tagger** is a high-performance file and folder tagging extension designed for VS Code, helping developers quickly organize and locate resources in complex projects. Through an intuitive visual interface and powerful tag management capabilities, it significantly enhances navigation efficiency and code organization experience for large-scale projects.

## 🚀 Core Features

### 1. Dual View Management System
- **Tag Tree View**: Displays workspace files in a tree structure with real-time tag synchronization, supports filtering untagged items, and focuses on critical resources.
- **Tag Summary View**: Aggregates resources by tag name, allowing you to expand and navigate to corresponding files with a single click, facilitating quick switching between modules.

### 2. Intelligent Auto-Sync
- **Editor Linkage**: Automatically selects and scrolls to the corresponding node in the sidebar when switching files in the editor.
- **View Activation Sync**: Automatically locates the current active file when the view is expanded, eliminating manual navigation.

### 3. Visual Enhancement
- **Badge Identification**: Tagged resources automatically display a `T` badge for quick recognition.
- **Theme Color Rendering**: Tag text is displayed in the theme's accent color next to file names, enhancing visual recognition.

### 4. Flexible Display Control
- **Hide Untagged Items**: Toggle via the "Eye" icon in the title bar to filter out untagged files and create a "Curated View".
- **State Persistence**: Display preferences are stored in the workspace state and persist across window reloads.

### 5. Enterprise-Grade Reliability
- **High-Performance Architecture**: Uses memory caching + debounced disk writing (500ms) mechanism, supporting millisecond-level response for tens of thousands of files.
- **Collaboration-Friendly**: Tags are stored in `.vscode/folder-tagger-tags.json`, syncable via Git for team collaboration.
- **Automatic Path Tracking**: Automatically handles file renaming, moving, or deletion, maintaining accurate tag mappings.

## 📦 Installation & Configuration

1. **Install from VS Code Marketplace**: Search for "Folder Tagger" and install.
2. **Manual Installation**: Download the `.vsix` file and use the "Install from VSIX" feature in VS Code.

## 🛠 Usage Guide

### Adding/Modifying Tags
- **Method 1**: Hover over a file and click the inline **`Modify Tags`** icon.
- **Method 2**: Right-click a file in the explorer and select **`Modify Tags`**.
- Enter tags in the input box, supporting comma, semicolon, or space as delimiters (e.g., `UI, Core Logic, To Fix`).

### Quick Navigation
- Right-click a file in the native explorer and select **`Reveal in Tag Tree`**.
- Click the **`Reveal in Native Explorer`** icon in the Tag Tree to jump back to the native view.

### Managing Tags
- **Remove Tags**: Trigger the "Modify Tags" command again, clear the input box, and confirm.
- **Refresh Data**: Click the refresh icon in the view title bar to force reload tag data from disk.

## 📁 Data Storage

All tag data is stored in JSON format at the project root:
- **Path**: `.vscode/folder-tagger-tags.json`
- **Format**: Keys as relative paths, values as tag arrays.

```json
{
  "src/components/Button.tsx": ["UI", "Refactoring"],
  "src/api/auth.ts": ["Backend Validation"]
}
```

## 🔧 Development & Contribution

1. **Clone the Repository**: `git clone <repository-url>`
2. **Install Dependencies**: `npm install`
3. **Development & Debugging**: Press `F5` to launch the Extension Development Host.
4. **Real-time Compilation**: Run `npm run watch` to keep TypeScript code automatically compiled.
5. **Packaging & Publishing**:
   - Generate `.vsix` file: `npx @vscode/vsce package`
   - Publish to Marketplace: `npx @vscode/vsce publish`

## 🌍 Internationalization Support

- Simplified Chinese
- English

## 📄 License

MIT License

## 🤝 Contribution

Welcome to submit Issues and Pull Requests to help improve the Folder Tagger extension!

---

**Folder Tagger** - Make your project organization more efficient and navigation more convenient.