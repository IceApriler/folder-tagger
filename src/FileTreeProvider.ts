import * as vscode from 'vscode';
import * as path from 'path';
import { TagService } from './TagService';

// 定义一个免疫超大文件夹递归解析的 OOM 防黑洞全局白名单
// 确保任何类似于此类会引起死机或绝不需要加入 Tag 的内部构建与环境缓存目录永不生成实体
const BLACKLISTED_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'build', '.vscode-test', 'target']);

export class FileTreeProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | void> = new vscode.EventEmitter<FileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | void> = this._onDidChangeTreeData.event;

    // 状态位：是否隐藏未标记的项目
    public isHideUntagged: boolean = false;

    constructor(
        private workspaceRoot: string | undefined,
        private tagService: TagService
    ) {}

    /**
     * 调用该函数能够强行通知 VSCode 重燃对扩展侧边栏下所有节点的绘图行为
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * VSCode 取决用何种载体绘制该条数据元
     */
    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    /**
     * 实现 getParent 以支持 TreeView.reveal 功能
     */
    getParent(element: FileItem): vscode.ProviderResult<FileItem> {
        const parentPath = path.dirname(element.resourceUri.fsPath);
        
        // 如果已经到达工作区根目录或更上级，则没有父节点（在我们的视图中）
        if (!this.workspaceRoot || parentPath.length < this.workspaceRoot.length || parentPath === this.workspaceRoot) {
            return undefined;
        }

        const parentUri = vscode.Uri.file(parentPath);
        const name = path.basename(parentPath);
        const isDirectory = true;
        
        // 获取父节点的 Tag 信息
        const tagList = this.tagService.getTagsForFsPath(parentPath);
        const desc = tagList && tagList.length > 0 ? `[${tagList.join(', ')}]` : '';

        return new FileItem(
            parentUri,
            name,
            isDirectory,
            vscode.TreeItemCollapsibleState.Collapsed,
            desc,
            'folder'
        );
    }

    /**
     * 取到节点子元素。由于我们在元素实例化阶段利用了 None/Collapsed 参数，使得系统唯独会在用户
     * 执行真正的鼠标下层展位点击时，才进入到本方法，从而完成了全宇宙最顺滑的按需懒加载流 (Lazy load)。
     */
    async getChildren(element?: FileItem): Promise<FileItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('当前并未开启有效的工程目录结构');
            return Promise.resolve([]);
        }

        // 如果传来的元素不为空，那么取其底下的展开绝对物理路径，否则说明请求处于顶层展开，我们给它灌入根目录
        const currentPath = element ? element.resourceUri.fsPath : this.workspaceRoot;
        
        try {
            // 利用 FS 系统进行实地考查式的一次浅读取
            let entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(currentPath));
            
            // 防御层机制：滤出那些会让运存和 CPU 卡带的构建系统输出大包或是庞杂且不会使用的隐藏包
            entries = entries.filter(([name, type]) => {
                // 1. 过滤掉 MacOS 系统的垃圾文件
                if (name === '.DS_Store') {
                    return false;
                }
                // 2. 过滤掉黑名单中的构建与环境文件夹
                if (type === vscode.FileType.Directory && BLACKLISTED_DIRS.has(name)) {
                    return false;
                }
                
                // 3. 性能优化：根据“隐藏未标记项”开关进行过滤
                if (this.isHideUntagged) {
                    const fullPath = path.join(currentPath, name);
                    if (type === vscode.FileType.Directory) {
                        // 文件夹：只有当文件夹本身有标，或者其子孙项有标时才显示
                        if (!this.tagService.hasTaggedDescendant(fullPath)) {
                            return false;
                        }
                    } else {
                        // 文件：只有当文件本身有标时才显示
                        const tags = this.tagService.getTagsForFsPath(fullPath);
                        if (!tags || tags.length === 0) {
                            return false;
                        }
                    }
                }

                return true;
            });

            // 基础排序：先把文件夹抽上来塞在前面，再依照 A-Z 把它们顺下
            entries.sort((a, b) => {
                if (a[1] === b[1]) {
                    return a[0].localeCompare(b[0]);
                }
                return a[1] === vscode.FileType.Directory ? -1 : 1;
            });

            // 最后开始组装与发包：按装箱要求给每一位对象套好数据返回数组
            return entries.map(([name, type]) => {
                const fsPath = path.join(currentPath, name);
                const uri = vscode.Uri.file(fsPath);
                
                const isDirectory = type === vscode.FileType.Directory;
                const collapsibleState = isDirectory 
                    ? vscode.TreeItemCollapsibleState.Collapsed // 定义成 Collapsed 则预示其底蕴还能展露，吸引下一次 getChildren 点击请求
                    : vscode.TreeItemCollapsibleState.None;

                // 即时比对提取针对该实体的标记词，如果没有那就是放个净空字符
                const tagList = this.tagService.getTagsForFsPath(fsPath);
                const desc = tagList && tagList.length > 0 
                    ? `[${tagList.join(', ')}]` 
                    : '';

                // 设置其角色身份是供 view/item/context 'when' 条件能够判断何时显露特定系统操作
                const contextValue = isDirectory ? 'folder' : 'file';

                return new FileItem(
                    uri,
                    name,
                    isDirectory,
                    collapsibleState,
                    desc,
                    contextValue
                );
            });
        } catch (err) {
            // 没有这级内容
            console.error('无法成功分析并读取指定的该级目录流向...', err);
            return [];
        }
    }
}

/**
 * 基本的对象体装载器
 */
export class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly labelBase: string,
        public readonly isDirectory: boolean,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly customDescription: string,
        public readonly customContextValue: string
    ) {
        // 装填原始 URI 以便将之关联为系统挂载
        super(resourceUri, collapsibleState);

        // 设置唯一 ID 以大幅度提升 TreeView.reveal 的性能（VSCode 会根据 ID 快速定位节点）
        this.id = this.resourceUri.fsPath;
        
        // 我们利用 description 这一特性为 Tag 配置了一个在名称右侧的原生且美观的居留处
        this.tooltip = this.resourceUri.fsPath;
        this.description = customDescription;
        this.contextValue = customContextValue;
        
        // 赋予非文件夹级别的元素直读触发器支持：当你在定制页点到普通代码文档上，会自动在中间编辑器激活它
        if (!this.isDirectory) {
            this.command = {
                title: '开启本栏目的直达文档口',
                command: 'vscode.open',
                arguments: [this.resourceUri]
            };
            this.iconPath = vscode.ThemeIcon.File;
        } else {
            // 给它带入官方 ThemeIcon 的文件夹图标皮肤包
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
