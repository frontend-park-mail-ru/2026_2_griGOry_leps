const bemName = '[a-z][a-z0-9]*(-[a-z0-9]+)*';

export default {
    extends: ['stylelint-config-standard-scss'],
    ignoreFiles: ['dist/**', 'node_modules/**', 'docs/**'],
    rules: {
        'selector-class-pattern': [
            `^${bemName}(__${bemName})?(--${bemName})?$`,
            {
                resolveNestedSelectors: true,
                message: (selector) => `Класс "${selector}" не по БЭМ: блок, блок__элемент, блок--модификатор`,
            },
        ],
        'selector-max-type': [0, { ignore: ['compounded'] }],
        'selector-max-id': 0,
        'selector-max-universal': 0,
        'scss/dollar-variable-colon-space-after': null,
        'scss/dollar-variable-empty-line-before': null,
        'declaration-empty-line-before': null,
        'rule-empty-line-before': null,
        'color-function-notation': null,
        'color-function-alias-notation': null,
        'alpha-value-notation': null,
        'media-feature-range-notation': null,
        'color-hex-length': null,
    },
    overrides: [
        {
            files: ['src/app/styles/**/*.scss'],
            rules: {
                'selector-max-type': null,
                'selector-max-id': null,
                'selector-max-universal': null,
            },
        },
    ],
};
