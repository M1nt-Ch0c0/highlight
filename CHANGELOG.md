# Change Log

## [2.0.0] - 2026-11-15

### 修复

- 清除高亮、或切换到另一个文件时，分屏和后台编辑器里会留下旧标记。现在所有可见编辑器一起更新，再次打开时也会清掉。
- 整词匹配不再使用 `\b`。中文可以按整词高亮；`$http` 这类不是字母开头的记号也不会被漏掉或误伤。
- 深色主题不再强制白字。黄色、橙色等浅背景会改用深色文字。
- `ignoreCase` 在配置缺失时曾回退成 `true`，和默认值 `false` 不一致。
- 大小写不敏感时，`Foo` 和 `foo` 会叠成两个高亮。现在按同一个词处理。
- 监听器和装饰器在扩展停用时没有释放。
- 快捷键以前全局生效，编辑器外面也会抢走「上一处问题」的 `Shift+F8`。现在只在编辑器里生效。
- 颜色或圆角配置损坏时不再把扩展打崩。空匹配也不会让搜索停不下来。
- 仓库地址改回 `https://github.com/M1nt-Ch0c0/highlight`。

### 新增

- 高亮词按工作区保存，重新打开后恢复。
- 状态栏计数，点击后可以勾选移除。
- 下一处 / 上一处高亮（`Alt+F8`、`Shift+Alt+F8`）。
- 多光标分别切换。
- 编辑器右键菜单。
- 每个词的匹配数上限、状态栏和持久化开关。
- 不依赖 VS Code 窗口的单元测试。

### 兼容

- 命令 `highlight.selectedWords`、`highlight.clearWords`，快捷键 `Shift+F8`、`Ctrl+Shift+F8`，以及原来的配置项（包括 `highlight.configuration.Bold`）都保持不变。
- 需要 VS Code 1.85 或更新版本。

## [1.0.0] - 2025-09-27 (Forked)

Forked from [debugpig/vscode-extension-highlight](https://github.com/debugpig/vscode-extension-highlight).

- Updated development dependencies.
- Added bold and border-radius settings.
- Adjusted highlighting for dark themes.
