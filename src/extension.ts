import * as vscode from 'vscode';
import * as path from 'path';
import { FileTreeProvider, FileItem } from './FileTreeProvider';
import { TagService } from './TagService';
import { TagSyncManager } from './TagSyncManager';
import { TagDecorationProvider } from './TagDecorationProvider';
import { TagSummaryProvider, FileNode, TagNode } from './TagSummaryProvider';

export async function activate(context: vscode.ExtensionContext) {
    const rootPath =
        (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : undefined;

    // ============================================
    // 1. 初始化核心底层持久存储区服务与 JSON 映射控制字典
    // ============================================
    const tagService = new TagService(rootPath);
    await tagService.initialize();

    // ============================================
    // 2. 注入自保护系统（监听各类文件物理变换的重映射）
    // ============================================
    const tagSyncManager = new TagSyncManager(tagService, context);
    tagSyncManager.activate();

    // ============================================
    // 3. 构建提供基本文件目录的装箱服务并对接左侧视图栏面板系统
    // ============================================
    const fileTreeProvider = new FileTreeProvider(rootPath, tagService);
    const treeView = vscode.window.createTreeView('folder-tagger-view', {
        treeDataProvider: fileTreeProvider,
        showCollapseAll: true // 开启顶部的“折叠全部”系统级原生按键
    });
    context.subscriptions.push(treeView);

    const tagSummaryProvider = new TagSummaryProvider(tagService);
    const summaryTreeView = vscode.window.createTreeView('folder-tagger-summary-view', {
        treeDataProvider: tagSummaryProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(summaryTreeView);

    // 每当外界或内在有新 Tag 变动的时候，系统必须自刷新
    context.subscriptions.push(
        tagService.onDidTagsChange(() => {
            fileTreeProvider.refresh();
            tagSummaryProvider.refresh();
        })
    );

    // ============================================
    // 4. 将标记对象染上原色蓝的挂饰支持者也推向全局接管系统注册入册
    // ============================================
    const tagDecorationProvider = new TagDecorationProvider(tagService, context);
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(tagDecorationProvider)
    );

    // 性能优化：防抖计时器，避免在原生树中快速导航时产生密集的 reveal 请求
    let revealTimer: NodeJS.Timeout | undefined;

    // ============================================
    // 5. 状态管理与显示设置
    // ============================================
    // 初始化配置状态：优先从配置中读取，兼容旧的工作区状态
    let isHideUntagged = vscode.workspace.getConfiguration('folderTagger').get<boolean>('hideUntagged', false);

    // 同步初始状态给 Provider
    fileTreeProvider.isHideUntagged = isHideUntagged;

    // 同步 Context Key 以支持 package.json 中的菜单图标条件切换
    const updateContextKeys = () => {
        isHideUntagged = vscode.workspace.getConfiguration('folderTagger').get<boolean>('hideUntagged', false);
        fileTreeProvider.isHideUntagged = isHideUntagged;
        vscode.commands.executeCommand('setContext', 'folderTagger.hideUntagged', isHideUntagged);
    };
    updateContextKeys();

    // 监听配置变更，同步逻辑状态
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('folderTagger.hideUntagged')) {
            updateContextKeys();
            fileTreeProvider.refresh();
        }
    }));
    
    // 辅助函数：统一处理同步定位逻辑
    const syncActiveEditor = (editor: vscode.TextEditor | undefined, source: string = 'unknown') => {
        if (!editor || !editor.document || editor.document.uri.scheme !== 'file') {
            return;
        }

        const fsPath = editor.document.uri.fsPath;
        console.log(`[FolderTagger] Syncing editor (${source}): ${path.basename(fsPath)}`);
        
        // 清理旧的定时器
        if (revealTimer) {
            clearTimeout(revealTimer);
        }

        // 延迟 100ms 执行，确保用户停下操作后再同步，大幅降低卡顿感
        revealTimer = setTimeout(async () => {
            // 1. 同步到 Tag Summary (仅当视图可见时)
            if (summaryTreeView.visible) {
                const tags = tagService.getTagsForFsPath(fsPath);
                if (tags && tags.length > 0) {
                    try {
                        const targetTag = tags[0]; 
                        const summaryNode = tagSummaryProvider.findNodeByPath(targetTag, fsPath);
                        if (summaryNode) {
                            await summaryTreeView.reveal(summaryNode, { select: true, focus: false, expand: true });
                        }
                    } catch (e) {
                        console.error('Auto-reveal in Summary failed', e);
                    }
                }
            }

            // 2. 同步到 Workspace Explorer (Tags) 面板
            // 修复：仅在视图可见时执行 reveal，避免从 SCM 等其他面板强制切换侧边栏
            if (treeView.visible) {
                try {
                    if (rootPath && fsPath.startsWith(rootPath)) {
                        const tagList = tagService.getTagsForFsPath(fsPath);
                        const desc = tagList && tagList.length > 0 ? `[${tagList.join(', ')}]` : '';
                        
                        const fileItem = new FileItem(
                            editor.document.uri,
                            path.basename(fsPath),
                            false, // isDirectory
                            vscode.TreeItemCollapsibleState.None,
                            desc,
                            'file'
                        );
                        
                        // reveal 会根据 getParent 自动展开层级定位
                        await treeView.reveal(fileItem, { select: true, focus: false, expand: true });
                        console.log(`[FolderTagger] Reveal triggered for: ${path.basename(fsPath)}`);
                    }
                } catch (e) {
                    console.error('Auto-reveal in Tree failed', e);
                }
            }
        }, 100);
    };

    // 0-Click Auto Sync: 追踪当前活动的文本编辑器在我们的各个视图中定位
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        syncActiveEditor(editor, 'EditorChanged');
    }));

    // 视图可见性监听：当用户展开或点击进入视图时，立即同步当前选中的文件
    context.subscriptions.push(treeView.onDidChangeVisibility(e => {
        if (e.visible) {
            syncActiveEditor(vscode.window.activeTextEditor, 'TreeViewVisible');
        }
    }));
    context.subscriptions.push(summaryTreeView.onDidChangeVisibility(e => {
        if (e.visible) {
            syncActiveEditor(vscode.window.activeTextEditor, 'SummaryVisible');
        }
    }));

    // 【策略：双重载入】确保重启窗口后，即使 VSCode 启动由于各种原因变慢，也能成功定位一次
    // 1. 立即执行一次
    syncActiveEditor(vscode.window.activeTextEditor, 'InitImmediate');
    // 2. 1秒后补偿执行一次（应对 VSCode 树视图初始化时延）
    setTimeout(() => {
        syncActiveEditor(vscode.window.activeTextEditor, 'InitDelayed');
    }, 1000);

    // ============================================
    // 5. 国际化与动作指令分发中心
    // ============================================
    
    // 简易国际化辅助函数
    const translations: Record<string, Record<string, string>> = {
        'en': {
            'inputBox.prompt.modifyTags': 'Edit tags for this resource (separate with commas, semicolons or spaces)',
            'inputBox.placeHolder.modifyTags': 'e.g. Core, Feature; UI Legacy',
            'msg.noValidObject': 'No valid file or folder selected.'
        },
        'zh-cn': {
            'inputBox.prompt.modifyTags': '修改当前资源的标签（可以用逗号、分号或空格分隔）',
            'inputBox.placeHolder.modifyTags': '如: 核心, 待办; UI 关键',
            'msg.noValidObject': '未选中有效的资源对象。'
        }
    };
    const lang = vscode.env.language.toLowerCase();
    const t = (key: string) => {
        const dict = translations[lang] || translations['en'];
        return dict[key] || key;
    };

    // 系统刷新动作：强制从磁盘重载数据并同步 UI
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.refreshEntry', async () => {
        await tagService.reloadFromFile();
        fileTreeProvider.refresh();
        tagSummaryProvider.refresh();
    }));

    // 指令 A：隐藏未标记项
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.hideUntagged', async () => {
        const config = vscode.workspace.getConfiguration('folderTagger');
        await config.update('hideUntagged', true, vscode.ConfigurationTarget.Workspace);
        // 配置更新后，onDidChangeConfiguration 会触发 UI 刷新
    }));

    // 指令 B：显示所有项
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.showUntagged', async () => {
        const config = vscode.workspace.getConfiguration('folderTagger');
        await config.update('hideUntagged', false, vscode.ConfigurationTarget.Workspace);
        // 配置更新后，onDidChangeConfiguration 会触发 UI 刷新
    }));
    
    // 指令 C：切换文件名高亮
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.toggleHighlight', async () => {
        const config = vscode.workspace.getConfiguration('folderTagger');
        const current = config.get<boolean>('enableFileNameHighlight', false);
        await config.update('enableFileNameHighlight', !current, vscode.ConfigurationTarget.Global);
        // TagDecorationProvider 会通过 onDidChangeConfiguration 自动监听到并刷新
    }));

    // 【核心能力】修改标签
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.modifyTags', async (node: any) => {
        let targetFsPath = '';
        if (node instanceof vscode.Uri) {
            targetFsPath = node.fsPath;
        } else if (node && node.resourceUri) {
            targetFsPath = node.resourceUri.fsPath;
        } else {
            vscode.window.showInformationMessage(t('msg.noValidObject'));
            return;
        }

        const existingTags = tagService.getTagsForFsPath(targetFsPath);
        const input = await vscode.window.showInputBox({ 
            prompt: t('inputBox.prompt.modifyTags'), 
            placeHolder: t('inputBox.placeHolder.modifyTags'),
            value: existingTags.join(', ')
        });
        
        if (input !== undefined) { // 用户没有按取消
            // 支持中英文逗号、分号及空格分割
            const newTags = input.split(/[,，;；\s]+/).map(s => s.trim()).filter(s => s);
            await tagService.setTags(targetFsPath, newTags);
        }
    }));

    // 让自定义树单点击直接跳转到原生资源管理器的当前项
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.revealInNative', async (node: any) => {
        if (node && node.resourceUri) {
            await vscode.commands.executeCommand('revealInExplorer', node.resourceUri);
        }
    }));

    // 从原生资源管理器右键点击，在标签树中定位
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.revealInTagTree', async (uri: vscode.Uri) => {
        if (uri && uri.scheme === 'file') {
            const fsPath = uri.fsPath;
            try {
                if (rootPath && fsPath.startsWith(rootPath)) {
                    const stats = await vscode.workspace.fs.stat(uri);
                    const isDirectory = stats.type === vscode.FileType.Directory;
                    
                    const tagList = tagService.getTagsForFsPath(fsPath);
                    const desc = tagList && tagList.length > 0 ? `[${tagList.join(', ')}]` : '';
                    
                    const item = new FileItem(
                        uri,
                        path.basename(fsPath),
                        isDirectory,
                        isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        desc,
                        isDirectory ? 'folder' : 'file'
                    );
                    
                    await treeView.reveal(item, { select: true, focus: true, expand: true });
                }
            } catch (e) {
                console.error('Manual reveal in Tree failed', e);
            }
        }
    }));
}

export function deactivate() {}
