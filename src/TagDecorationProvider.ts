import * as vscode from 'vscode';
import { TagService } from './TagService';

export class TagDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    constructor(private tagService: TagService, private context: vscode.ExtensionContext) {
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
            return {
                badge: 'T', // 在默认图标右侧挤入一个小巧的 T 微标
                color: new vscode.ThemeColor('charts.blue'), // 改写它在树图界面中的排版字体为深邃蓝
                tooltip: `已挂载的 Tag: ${tags.join(', ')}` // 当鼠标经过时悬浮呈现的详情文本
            };
        }
        return undefined; // 不是我们的菜，原物返回即可
    }
}
