# Folder Tagger (文件夹标签)

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/IceApriler/folder-tagger@master/media/icon.png" width="128" alt="Logo" />
</p>

<p align="center">
  <a href="https://github.com/IceApriler/folder-tagger" target="_blank">
    <img src="https://img.shields.io/github/stars/IceApriler/folder-tagger?style=social" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/IceApriler/folder-tagger" target="_blank">
    <img src="https://img.shields.io/github/forks/IceApriler/folder-tagger?style=social" alt="GitHub Forks" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=IceApriler.folder-tagger" target="_blank">
    <img src="https://img.shields.io/visual-studio-marketplace/v/IceApriler.folder-tagger" alt="VS Code Marketplace Version" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/IceApriler/folder-tagger" target="_blank">GitHub 仓库</a> • 
  <a href="https://marketplace.visualstudio.com/items?itemName=IceApriler.folder-tagger" target="_blank">VS Code 市场</a>
</p>

> ⭐ 如果觉得这个扩展对你有帮助，请给我们一个 Star 支持！

**Folder Tagger** 是一款专为 VS Code 设计的高性能文件与文件夹标签管理扩展，旨在帮助开发者在复杂项目中快速组织和定位资源。通过直观的可视化界面和强大的标签管理功能，显著提升大型项目的导航效率和代码组织体验。

## 🚀 核心特性

### 1. 双视图管理系统

<img src="https://cdn.jsdelivr.net/gh/IceApriler/folder-tagger@master/media/screenshots/dual-view.png" width="600" alt="Dual View Management" />

- **标签树视图**：以树状结构展示工作区文件，实时同步标签显示，支持过滤未标记项，专注于关键资源。
- **标签汇总视图**：按标签名称聚合资源，点击标签可展开并跳转至对应文件，便于跨模块快速切换。

### 2. 智能自动同步

- **编辑器联动**：当在编辑器中切换文件时，自动在侧边栏选中并滚动到对应节点。
- **视图激活同步**：视图展开时自动定位到当前活动文件，无需手动导航。

### 3. 视觉增强标记

- **徽章标识**：已标记资源自动显示 `T` 徽章，一目了然。
- **主题色渲染**：标签文本以主题强调色显示在文件名右侧，增强视觉识别。

### 4. 灵活的显示控制

- **隐藏未标记项**：通过标题栏的"眼睛"图标切换，一键过滤未标记文件，创建"精选视图"。
- **状态持久化**：显示偏好存储在工作区状态中，重启窗口后保持不变。

### 5. 企业级可靠性

- **高性能架构**：采用内存缓存 + 防抖写盘 (500ms) 机制，支持数万级文件的毫秒级响应。
- **协作友好**：标签存储于 `.vscode/folder-tagger-tags.json`，可通过 Git 同步，支持团队协作。
- **路径自动追踪**：自动处理文件重命名、移动或删除，保持标签映射的准确性。

## 📦 安装与配置

1. **从 VS Code 扩展市场安装**：搜索 "Folder Tagger" 并安装。
2. **手动安装**：下载 `.vsix` 文件，在 VS Code 中使用 "从 VSIX 安装" 功能。

## 🛠 使用指南

### 添加/修改标签

- **方法一**：鼠标悬浮在文件上，点击行内的 **`修改标签`** 图标。
- **方法二**：在资源管理器中右键点击文件，选择 **`修改标签`**。
- 在输入框中输入标签，支持使用逗号、分号或空格分隔（例如：`UI, 核心逻辑, 待修复`）。

### 快速定位

- 在原生资源管理器中右键点击文件，选择 **`在标签树中显示`**。
- 在标签树中点击 **`在资源管理器中显示`** 图标，跳回原生视图。

### 管理标签

- **移除标签**：再次触发 "修改标签" 命令，清空输入框并确认。
- **刷新数据**：点击视图标题栏的刷新图标，强制从磁盘重载标签数据。

## 📁 数据存储

所有标签数据以 JSON 格式存储在项目根目录：

- **路径**：`.vscode/folder-tagger-tags.json`
- **格式**：键为相对路径，值为标签数组。

```json
{
  "src/components/Button.tsx": ["UI", "重构中"],
  "src/api/auth.ts": ["后端校验"]
}
```

## 🛠 开发与贡献

1. **克隆仓库**：`git clone <repository-url>`
2. **安装依赖**：`npm install`
3. **开发调试**：按下 `F5` 启动扩展开发宿主。
4. **实时编译**：运行 `npm run watch` 保持 TypeScript 代码自动编译。
5. **打包发布**：
   - 生成 `.vsix` 文件：`npx @vscode/vsce package`
   - 发布到扩展市场：`npx @vscode/vsce publish`

## 🌍 国际化支持

- 中文 (简体)
- 英文

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request，共同改进 Folder Tagger 扩展！

---

**Folder Tagger** - 让你的项目组织更高效，导航更便捷。
