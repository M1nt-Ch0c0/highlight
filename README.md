# Highlight

[![Open VSX](https://img.shields.io/open-vsx/v/M1nt-Ch0c0/highlight)](https://open-vsx.org/extension/M1nt-Ch0c0/highlight)

在光标所在的词，或选中的文本上按一下，就把同样的内容标出来。高亮按工作区记住，分屏里的编辑器会一起更新。

Press once on the word under the cursor, or on a selection, to mark every occurrence. Highlights are remembered for the workspace and stay in sync across split editors.

## 用法

| 动作 | 快捷键 | 命令 |
| --- | --- | --- |
| 高亮 / 取消高亮 | `Shift+F8` | `Highlight: Highlight/Unhighlight Selected Words` |
| 清除全部 | `Ctrl+Shift+F8` | `Highlight: Clear all Highlight Words` |
| 下一处 | `Alt+F8` | `Highlight: Go to Next Highlight` |
| 上一处 | `Shift+Alt+F8` | `Highlight: Go to Previous Highlight` |

快捷键只在编辑器获得焦点时生效，不再占用问题面板里的 `Shift+F8`。编辑器右键菜单里也有高亮和清除。支持多光标：每个光标下的词单独切换。

状态栏会显示当前高亮了几个词，点一下可以勾掉其中几个。重新打开工作区后会恢复，除非关掉 `highlight.configuration.persist`。

![高亮与取消](./resource/highlight_add_remove.gif)

![清除全部](./resource/highlight_remove_all.gif)

## 设置

* `highlight.configuration.wholeWord`：只高亮整词。默认 `true`。中文、以及 `$http` 这种不是字母开头的记号也会按整词处理。
* `highlight.configuration.ignoreCase`：忽略大小写。默认 `false`。
* `highlight.configuration.Bold`：高亮文字是否加粗。默认 `true`。
* `highlight.configuration.borderRadius`：圆角，例如 `5px`。
* `highlight.configuration.colors`：颜色列表。每一项有 `light` 和 `dark`。文字颜色会按背景对比度自动选黑或白。
* `highlight.configuration.maxMatches`：每个词在一个文档里最多画多少处。默认 `5000`。
* `highlight.configuration.showStatusBar`：是否显示状态栏计数。默认 `true`。
* `highlight.configuration.persist`：重新打开工作区时是否恢复。默认 `true`。

词的个数超过颜色数时，颜色会循环使用。

## English

| Action | Key | Command |
| --- | --- | --- |
| Toggle highlight | `Shift+F8` | Highlight/Unhighlight Selected Words |
| Clear all | `Ctrl+Shift+F8` | Clear all Highlight Words |
| Next match | `Alt+F8` | Go to Next Highlight |
| Previous match | `Shift+Alt+F8` | Go to Previous Highlight |

Keybindings apply only while the editor has focus, so `Shift+F8` still moves between problems outside the editor. The same two actions are on the editor context menu. Each cursor toggles its own word.

The status bar shows how many words are highlighted; click it to remove some of them. Words are restored when the workspace reopens unless `highlight.configuration.persist` is off.

Whole-word matching is Unicode-aware, so CJK text and tokens such as `$http` match as a unit. Highlight text uses black or white depending on the background, including the default dark-theme palette.

## 许可

MIT. Forked from [debugpig/vscode-extension-highlight](https://github.com/debugpig/vscode-extension-highlight), with reference to [rsbondi/highlight-words](https://github.com/rsbondi/highlight-words).
