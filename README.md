# README

This extension highlights selected words.

## Features

-   Supports highlighting/unhighlighting selected words (shift+F8)

    ![Supports highlighting/unhighlighting selected words](./resource/highlight_add_remove.gif)

-   Supports clearing all highlighted words (ctrl+shift+F8)

    ![Supports clearing all highlighted words](./resource/highlight_remove_all.gif)

## Extension Settings

*   `highlight.configuration.wholeWord`: Whether to highlight whole words only. (boolean, default: `true`)
*   `highlight.configuration.ignoreCase`: Whether to ignore case when highlighting. (boolean, default: `false`)
*   `highlight.configuration.Bold`: Whether the highlighted text should be bold. (boolean, default: `true`)
*   `highlight.configuration.borderRadius`: Border radius of the highlight. (string, default: `"5px"`)
*   `highlight.configuration.colors`: Colors used for highlighting. (array)

## Known Issues

N/A

## Release Notes

### 1.0.0 (Forked)

-   **Dependencies**: Updated and fixed outdated project development dependencies.
-   **Configuration**: Added configurations for "whether to bold" (`highlight.configuration.Bold`) and "border radius" (`highlight.configuration.borderRadius`).
-   **Highlighting**: Implemented a highlighting method that maintains visual consistency in dark mode.

## Reference

Reference list:
- https://github.com/debugpig/vscode-extension-highlight
- https://github.com/rsbondi/highlight-words

**Enjoy!**
