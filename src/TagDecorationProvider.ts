import * as vscode from 'vscode';
import { TagService } from './TagService';

export class TagDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    // 状态位：是否显示具体的标签数量
    public showBadgeCount: boolean = false;

    constructor(private tagService: TagService, private context: vscode.ExtensionContext) {
        // 监听配置更改，以便实时刷新装饰
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('folderTagger.tagColor') || 
                    e.affectsConfiguration('folderTagger.enableFileNameHighlight')) {
                    this.refresh();
                }
            })
        );

        // 监听来自后台字典的更新号角
        this.context.subscriptions.push(
            this.tagService.onDidTagsChange(() => {
                // 传空值将迫使 VSCode 直接在能见度范围内对所有的 FileDecoration 统筹进行一把刷新检测
                this._onDidChangeFileDecorations.fire(undefined);
            })
        );
    }

    /**
     * 该系统钩子会被 VSCode 不断调用，用于计算某个 URI 文件在外观上该如何展现其独特性
     */
    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        // 由于存在非常多抽象协议或非实体页面的配置界面（如 memory:// 等），我们在此处屏蔽所有非真实的硬盘文件
        if (uri.scheme !== 'file') {
            return undefined;
        }

        const tags = this.tagService.getTagsForFsPath(uri.fsPath);
        
        // 当查询到此实体资源确实包含被赋予的 Tag 集合后，开启特效
        if (tags && tags.length > 0) {
            const config = vscode.workspace.getConfiguration('folderTagger');
            const tagColor = config.get<string>('tagColor', 'charts.blue');
            const enableFileNameHighlight = config.get<boolean>('enableFileNameHighlight', false);

            return {
                badge: 'T', // 固定显示经典的“T”微标
                // VSCode API 限制：color 会同时作用于文字和 Badge。
                // 如果用户希望文件名不亮，我们只能不传 color。
                color: enableFileNameHighlight ? new vscode.ThemeColor(tagColor) : undefined,
                tooltip: `已挂载的 ${tags.length} 个 Tag: ${tags.join(', ')}`,
            };
        }
        return undefined; // 不是我们的菜，原物返回即可
    }

    /**
     * 手动触发徽标刷新
     */
    public refresh(): void {
        this._onDidChangeFileDecorations.fire(undefined);
    }
}
