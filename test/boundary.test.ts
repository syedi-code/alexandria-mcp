import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The protocol layer may not know where the books are kept. Only the adapters
 * under src/d1 and src/worker may mention Cloudflare, which is what lets a
 * Library be a database, an API, or a directory of files.
 *
 * Nothing fails at runtime when this is crossed, so it is held here.
 */
const ADAPTERS = ['src/d1', 'src/worker'];

/** Posix-separated, so the boundary reads the same on every platform. */
function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = `${dir}/${entry}`;
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return path.endsWith('.ts') ? [path] : [];
	});
}

describe('the protocol layer', () => {
	const files = sourceFiles('src').filter(
		(path) => !ADAPTERS.some((dir) => path.startsWith(`${dir}/`))
	);

	it('covers more than the adapters', () => {
		expect(files.length).toBeGreaterThan(3);
	});

	it.each(files)('%s names no Cloudflare binding', (path) => {
		expect(readFileSync(path, 'utf8')).not.toMatch(
			/cloudflare|D1Database|R2Bucket/i
		);
	});
});
