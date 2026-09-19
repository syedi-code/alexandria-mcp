import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
	{ ignores: ['node_modules/**', 'dist/**', '.wrangler/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ fixStyle: 'inline-type-imports' },
			],
		},
	}
);
