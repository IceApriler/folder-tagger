import * as vscode from 'vscode';
import * as path from 'path';
import { FileTreeProvider, FileItem } from './FileTreeProvider';
import { TagService } from './TagService';
import { TagSyncManager } from './TagSyncManager';
import { TagDecorationProvider } from './TagDecorationProvider';

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

    // 每当外界或内在有新 Tag 变动的时候，系统必须自刷新
    context.subscriptions.push(
        tagService.onDidTagsChange(() => fileTreeProvider.refresh())
    );

    // ============================================
    // 4. 将标记对象染上原色蓝的挂饰支持者也推向全局接管系统注册入册
    // ============================================
    const tagDecorationProvider = new TagDecorationProvider(tagService, context);
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(tagDecorationProvider)
    );

    // ============================================
    // 5. 将各种暴露向外用于点击使用的动作能力分发给各个系统级上下文按键栏
    // ============================================
    
    // 给系统留一个刷新动作点
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.refreshEntry', () => {
        fileTreeProvider.refresh();
    }));

    // 让悬浮区“加号”起效，在上方吊取一个输入框后，切割文字送给控制器
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.addTag', async (node: FileItem) => {
        const input = await vscode.window.showInputBox({ 
            prompt: '为该系统文件或文件夹追加分配最新定义的自定义 Tag，多个项可以通过逗号将其断开', 
            placeHolder: '例如撰写格式: 关键模块, 已处理, 待测试' 
        });
        
        if (input && input.trim()) {
            const newTags = input.split(',').map(s => s.trim()).filter(s => s);
            await tagService.addTag(node.resourceUri.fsPath, newTags);
        }
    }));

    // 解除绑定移除命令，通过给用户一个下拉栏确认进行单一移除行为
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.removeTag', async (node: FileItem) => {
        const existingTags = tagService.getTagsForFsPath(node.resourceUri.fsPath);
        if (!existingTags || existingTags.length === 0) {
            vscode.window.showInformationMessage('报告！我们并未在这个文件上找到存在绑定的标记。');
            return;
        }

        // 若没多词干脆地扯掉那唯一一块 Tag 则完事
        if (existingTags.length === 1) {
            await tagService.removeTag(node.resourceUri.fsPath, existingTags[0]);
            return;
        }

        // 如果不止包含一项，让使用者通过点选 QuickPick 选择项精确开除那个名字
        const selection = await vscode.window.showQuickPick(existingTags, {
            placeHolder: '列表拥有多个组合绑定定义，请选择决定你要撤销的 Tag 名称'
        });

        if (selection) {
            await tagService.removeTag(node.resourceUri.fsPath, selection);
        }
    }));

    // 为真实文件底层处理实现一键“真实现实操刀”——将目标抛进垃圾笼里去
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.deleteItem', async (node: FileItem) => {
        const confirm = await vscode.window.showWarningMessage(`此行为后果自负，确定需要将 ${node.labelBase} 放纵进系统的垃圾回收站吗？`, { modal: true }, '我明白后果要求确认并移动');
        if (confirm === '我明白后果要求确认并移动') {
            await vscode.workspace.fs.delete(node.resourceUri, { recursive: true, useTrash: true });
        }
    }));

    // 用 inputBox 取新名字后调用原名换牌手法接轨到系统重命名 API 去
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.renameItem', async (node: FileItem) => {
        const newName = await vscode.window.showInputBox({ value: node.labelBase, prompt: '输入该资源意欲重演的新名称' });
        if (newName && newName !== node.labelBase) {
            const newUri = vscode.Uri.file(path.join(path.dirname(node.resourceUri.fsPath), newName));
            await vscode.workspace.fs.rename(node.resourceUri, newUri);
        }
    }));

    // 基于传入进来的文件根属或者上一级目录结构为其顺带新拉起一个对接到这儿定位的开发命令台
    context.subscriptions.push(vscode.commands.registerCommand('folder-tagger.openTerminal', async (node: FileItem) => {
        const cwd = node.isDirectory ? node.resourceUri.fsPath : path.dirname(node.resourceUri.fsPath);
        const terminal = vscode.window.createTerminal({ cwd });
        terminal.show();
    }));
}

export function deactivate() {}
