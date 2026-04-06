import * as vscode from 'vscode';
import * as path from 'path';
import { TagService } from './TagService';

export class TagSummaryProvider implements vscode.TreeDataProvider<TagNode | FileNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TagNode | FileNode | undefined | void> = new vscode.EventEmitter<TagNode | FileNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TagNode | FileNode | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private tagService: TagService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TagNode | FileNode): vscode.TreeItem {
        return element;
    }

    getParent(element: TagNode | FileNode): vscode.ProviderResult<TagNode | FileNode> {
        if (element instanceof FileNode) {
            const tagData = this.tagService.getAllTagsData();
            const count = tagData.get(element.parentTagName)?.length || 0;
            return new TagNode(element.parentTagName, count);
        }
        return null;
    }

    async getChildren(element?: TagNode | FileNode): Promise<(TagNode | FileNode)[]> {
        // 请求根节点时，返回所有存在的 Tag
        if (!element) {
            const tagData = this.tagService.getAllTagsData();
            if (tagData.size === 0) {
                return [];
            }
            const tagNames = Array.from(tagData.keys()).sort();
            return tagNames.map(tagName => new TagNode(tagName, tagData.get(tagName)!.length));
        }

        // 如果请求的是 Tag 节点，则返回属于该 Tag 的所有文件
        if (element instanceof TagNode) {
            const tagData = this.tagService.getAllTagsData();
            const filePaths = tagData.get(element.tagName) || [];
            
            return filePaths.sort().map(fsPath => {
                const uri = vscode.Uri.file(fsPath);
                return new FileNode(uri, path.basename(fsPath), element.tagName);
            });
        }

        return [];
    }

    public findNodeByPath(tagName: string, fsPath: string): FileNode | undefined {
        return new FileNode(vscode.Uri.file(fsPath), path.basename(fsPath), tagName);
    }
}

/**
 * 根节点：某一个具体的 Tag
 */
export class TagNode extends vscode.TreeItem {
    constructor(
        public readonly tagName: string,
        public readonly fileCount: number
    ) {
        super(tagName, vscode.TreeItemCollapsibleState.Expanded);
        this.id = `tag_${tagName}`;
        this.contextValue = 'tag';
        this.description = `(${fileCount})`;
        this.iconPath = new vscode.ThemeIcon('tag');
    }
}

/**
 * 叶子节点：具体带有这个 Tag 的文件
 */
export class FileNode extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly label: string,
        public readonly parentTagName: string
    ) {
        super(resourceUri, vscode.TreeItemCollapsibleState.None);
        
        this.id = `file_${parentTagName}_${resourceUri.fsPath}`;
        this.contextValue = 'file';
        this.tooltip = this.resourceUri.fsPath;
        
        // 文件节点带有一个默认的点击跳转事件
        this.command = {
            title: 'Open File',
            command: 'vscode.open',
            arguments: [this.resourceUri]
        };
    }
}
