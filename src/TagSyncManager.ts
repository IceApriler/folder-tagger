import * as vscode from 'vscode';
import { TagService } from './TagService';

export class TagSyncManager {
    constructor(private tagService: TagService, private context: vscode.ExtensionContext) {}

    public activate() {
        // VSCode 原生系统级拦截：当用户重命名或者拖拽移动工作区下的任何文件时触发
        const renameSubscription = vscode.workspace.onDidRenameFiles(async (e: vscode.FileRenameEvent) => {
            const promises = e.files.map(file => {
                // 将旧地址的 Tag 属性完整迁移粘附到新的地址之下
                return this.tagService.renameTagPath(file.oldUri.fsPath, file.newUri.fsPath);
            });
            await Promise.all(promises);
        });

        // 侦测文件销毁事件，用来实现 json 数据无死角净化
        const deleteSubscription = vscode.workspace.onDidDeleteFiles(async (e: vscode.FileDeleteEvent) => {
            const promises = e.files.map(file => {
                return this.tagService.deleteTags(file.fsPath);
            });
            await Promise.all(promises);
        });

        this.context.subscriptions.push(renameSubscription);
        this.context.subscriptions.push(deleteSubscription);

        // 如果配置的存储路径可用，我们针对该底层实体文件做一层防篡改协作锁
        if (this.tagService.tagsFilePath) {
            // 利用 RelativePattern 指针精准锁定底部的那个 tags.json
            const relativePattern = new vscode.RelativePattern(
                vscode.workspace.getWorkspaceFolder(vscode.Uri.file(this.tagService.tagsFilePath)) || vscode.workspace.workspaceFolders![0], 
                '.vscode/folder-tagger-tags.json'
            );
            
            const watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
            
            // 无感刷新：任何时候别人（如从 Git 获取）或者直接在系统文件管理器内改写、重建或是干脆删掉了这个 tags
            // Watcher 都会截断内存并重启数据载入，真正做到企业级多端协作同步安全
            watcher.onDidChange(() => this.tagService.reloadFromFile());
            watcher.onDidCreate(() => this.tagService.reloadFromFile());
            watcher.onDidDelete(() => this.tagService.reloadFromFile());

            this.context.subscriptions.push(watcher);
        }
    }
}
