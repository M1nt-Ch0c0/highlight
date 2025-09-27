# README

该插件可将选中的单词进行高亮。

## Features

- 支持选中/取消单词高亮(shift+F8)

  ![支持选中/取消单词高亮](./resource/highlight_add_remove.gif)
- 支持全量取消单词高亮(ctrl+shift+F8)

  ![支持全量取消单词高亮](./resource/highlight_remove_all.gif)

## Extension Settings

* `highlight.configuration.wholeWord`: 是否完整单词匹配(boolean)
* `highlight.configuration.ignoreCase`: 是否完整忽略大小写匹配(boolean)
* `highlight.configuration.colors`: 高亮的颜色配置(array)

## Known Issues

N/A

## Release Notes

### 1.0.0 (Forked)

-   **Dependencies**: Updated and fixed outdated project development dependencies.
-   **Configuration**: Added configurations for "whether to bold" (`highlight.configuration.Bold`) and "border radius" (`highlight.configuration.borderRadius`).
-   **Highlighting**: Implemented a highlighting method that maintains visual consistency in dark mode.

## Reference

reference list:
- https://github.com/debugpig/vscode-extension-highlight
- https://github.com/rsbondi/highlight-words

**Enjoy!**
