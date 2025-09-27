
import * as vscode from 'vscode';

interface Color {
    light: string;
    dark: string;
}

export class Config {
    constructor() {
        let config = vscode.workspace.getConfiguration('');
        const wholeWordConfig = config.get<boolean>('highlight.configuration.wholeWord');
        this.wholeWord = wholeWordConfig === undefined ? true : wholeWordConfig;

        const ignoreCaseConfig = config.get<boolean>('highlight.configuration.ignoreCase');
        this.ignoreCase = ignoreCaseConfig === undefined ? true : ignoreCaseConfig;

        const isBoldConfig = config.get<boolean>('highlight.configuration.Bold');
        this.isBold = isBoldConfig === undefined ? true : isBoldConfig;

        const borderRadiusConfig = config.get<string>('highlight.configuration.borderRadius');
        this.borderRadius = borderRadiusConfig === undefined ? '5px' : borderRadiusConfig;

        // 获取所有颜色
        this.decorationTypes = [];
        const colors = config.get<Color[]>('highlight.configuration.colors');
        if (colors) {
            colors.forEach((color: Color) => {
                let decorationType = vscode.window.createTextEditorDecorationType({
                    overviewRulerLane: vscode.OverviewRulerLane.Right,
                    light: {
                        overviewRulerColor: color.light,
                        backgroundColor: color.light,
                        fontWeight: this.isBold ? 'bold' : 'normal',
                        borderRadius: this.borderRadius
                    },
                    dark: {
                        overviewRulerColor: color.dark,
                        backgroundColor: color.dark,
                        color: '#ffffff',
                        fontWeight: this.isBold ? 'bold' : 'normal',
                        borderRadius: this.borderRadius
                    }
                });
                this.decorationTypes.push(decorationType);
            });
        }
    }

    public IsIgnoreCase(): boolean {
        return this.ignoreCase;
    }

    public IsWholeWord(): boolean {
        return this.wholeWord;
    }

    public GetDecorationTypes(): vscode.TextEditorDecorationType[] {
        return this.decorationTypes;
    }

    private wholeWord: boolean;
    private ignoreCase: boolean;
    private isBold: boolean;
    private borderRadius: string;
    private decorationTypes: vscode.TextEditorDecorationType[];
}
