import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export class TagService {
    // 内存中的 Tag 字典，键为相对路径，值为 Tag 数组
    private tagsMap: Map<string, string[]> = new Map();
    // 存储 tags.json 文件的绝对路径
    public tagsFilePath: string | undefined;

    // 向外广播数据变更的核心事件派发器
    public readonly _onDidTagsChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidTagsChange: vscode.Event<void> = this._onDidTagsChange.event;

    // 用于写入防抖的定时器
    private persistTimeout: NodeJS.Timeout | undefined;

    constructor(private workspaceRoot: string | undefined) {
        if (this.workspaceRoot) {
            // 初始化 JSON 映射文件的保存位置：位于工作区根目录的 .vscode 文件夹下
            this.tagsFilePath = path.join(this.workspaceRoot, '.vscode', 'tags.json');
        }
    }

    /**
     * 首次初始化拉取数据
     */
    public async initialize(): Promise<void> {
        await this.reloadFromFile();
    }

    /**
     * 强制从磁盘重载数据
     * 常用于其他协作者提交了新的 tags.json 后热重载，彻底摒弃现有的内存 map。
     */
    public async reloadFromFile(): Promise<void> {
        if (!this.tagsFilePath) return;
        try {
            const data = await fs.readFile(this.tagsFilePath, 'utf8');
            const parsed = JSON.parse(data);
            
            // 清理旧引用
            this.tagsMap.clear();
            for (const [key, val] of Object.entries(parsed)) {
                if (Array.isArray(val)) {
                    this.tagsMap.set(key, val);
                }
            }
            // 触发事件通知所有的视图进行重绘
            this._onDidTagsChange.fire();
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('无法重新加载 tags.json 文件', error);
            } else {
                // 如果文件在外部被删除了，我们清空现有的 Tag 并触发界面状态复位
                this.tagsMap.clear();
                this._onDidTagsChange.fire();
            }
        }
    }

    /**
     * 将绝对路径转换为针对工作区根目录的跨平台统一相对路径
     */
    private normalize(fsPath: string): string | null {
        if (!this.workspaceRoot) return null;
        return path.relative(this.workspaceRoot, fsPath).split(path.sep).join('/');
    }

    /**
     * 同步获取特定路径的 Tags，时间复杂度 O(1)
     */
    public getTagsForFsPath(fsPath: string): string[] {
        const key = this.normalize(fsPath);
        if (!key) return [];
        return this.tagsMap.get(key) || [];
    }

    /**
     * 追加新的 Tags
     */
    public async addTag(fsPath: string, newTags: string[]): Promise<void> {
        const key = this.normalize(fsPath);
        if (!key) return;

        const existingTags = this.tagsMap.get(key) || [];
        // 利用 Set 自动去重
        const updatedTagsSet = new Set([...existingTags, ...newTags]);
        this.tagsMap.set(key, Array.from(updatedTagsSet));
        
        this._onDidTagsChange.fire();
        this.schedulePersist();
    }

    /**
     * 单点移除某个指定的 Tag
     */
    public async removeTag(fsPath: string, targetTag: string): Promise<void> {
        const key = this.normalize(fsPath);
        if (!key) return;

        const existingTags = this.tagsMap.get(key);
        if (!existingTags) return;

        // 过滤掉选中的那个 targetTag
        const filtered = existingTags.filter(t => t !== targetTag);
        if (filtered.length === 0) {
            // 如果删光了，彻底把该文件的键从字典里除去
            this.tagsMap.delete(key);
        } else {
            this.tagsMap.set(key, filtered);
        }
        
        this._onDidTagsChange.fire();
        this.schedulePersist();
    }

    /**
     * 重命名路径，用于追踪文件的位移或改名
     */
    public async renameTagPath(oldFsPath: string, newFsPath: string): Promise<void> {
        const oldKey = this.normalize(oldFsPath);
        const newKey = this.normalize(newFsPath);
        if (!oldKey || !newKey) return;

        const targetTags = this.tagsMap.get(oldKey);
        if (targetTags) {
            this.tagsMap.set(newKey, targetTags);
            this.tagsMap.delete(oldKey);
            this._onDidTagsChange.fire();
            this.schedulePersist();
        }
    }

    /**
     * 删除整个文件的 Tags，用于监听文件彻底删除动作时的自我保洁清理
     */
    public async deleteTags(fsPath: string): Promise<void> {
        const key = this.normalize(fsPath);
        if (!key) return;

        if (this.tagsMap.has(key)) {
            this.tagsMap.delete(key);
            this._onDidTagsChange.fire();
            this.schedulePersist();
        }
    }

    /**
     * 防抖：聚集密集的更改，最后在倒计时结束统一落盘
     */
    private schedulePersist(): void {
        if (this.persistTimeout) clearTimeout(this.persistTimeout);
        this.persistTimeout = setTimeout(async () => {
            await this.internalPersist();
        }, 500);
    }

    /**
     * 核心写入逻辑
     */
    private async internalPersist(): Promise<void> {
        if (!this.tagsFilePath) return;
        
        const outObj: Record<string, string[]> = {};
        for (const [key, val] of this.tagsMap.entries()) {
            if (val && val.length > 0) {
                outObj[key] = val;
            }
        }
        
        try {
            // 若目录不存在则建立目录
            await fs.mkdir(path.dirname(this.tagsFilePath), { recursive: true });
            // 以覆写模式打入序列化的 JSON 结构
            await fs.writeFile(this.tagsFilePath, JSON.stringify(outObj, null, 2), 'utf8');
        } catch (error) {
            console.error('无法成功写入 tags.json 文件', error);
        }
    }
}
