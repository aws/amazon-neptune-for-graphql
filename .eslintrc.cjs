module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "overrides": [
        {
            "env": {
                "node": true,
                "jest": true
            },
            "files": [
                ".eslintrc.{js,cjs}",
                "./src/test/**",
                "./templates/**",
                "./test/**"
            ],
            "parserOptions": {
                "sourceType": "module"
            }
        }
    ],
    "ignorePatterns": ["**/output/"],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
    },
    "globals": {
        "process": true
    }

}
