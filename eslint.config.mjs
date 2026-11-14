import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        files: ["src/**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "warn",
                { selector: "class", format: ["PascalCase"] },
                { selector: "interface", format: ["PascalCase"] },
                { selector: "typeAlias", format: ["PascalCase"] },
            ],
            curly: "warn",
            eqeqeq: "warn",
            "no-throw-literal": "warn",
        },
    },
];
