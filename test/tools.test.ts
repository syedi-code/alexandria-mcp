import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
import { ToolUnavailableError, type Library } from '../src/library.js';
import { MAX_PAGES_PER_READ, tools } from '../src/tools.js';
import { fakeLibrary } from './fake-library.js';

const textOf = (result: CallToolResult): string => {
	const [first] = result.content;
	if (!first || first.type !== 'text') throw new Error('not text');
	return first.text;
};

const read = (input: unknown, library: Library = fakeLibrary()) =>
	tools.read_pages.call(library, input);

const verify = async (quote: string, page_no = 1) =>
	JSON.parse(
		textOf(
			await tools.verify_citation.call(fakeLibrary(), {
				document_id: 'd1',
				page_no,
				quote,
			})
		)
	);

describe('read_pages', () => {
	it('reads a range in order', async () => {
		const text = textOf(await read({ document_id: 'd1', from: 1, to: 3 }));
		expect(text.indexOf('PDF p. 1')).toBeLessThan(text.indexOf('PDF p. 2'));
	});

	it('never asks for more than the cap, however wide the range', async () => {
		const getPages = vi.fn().mockResolvedValue([]);
		await read(
			{ document_id: 'd1', from: 1, to: 500 },
			fakeLibrary({ getPages })
		);
		expect(getPages.mock.calls[0][1]).toHaveLength(MAX_PAGES_PER_READ);
	});

	it('says so when a page has no text layer', async () => {
		expect(textOf(await read({ document_id: 'd1', from: 3 }))).toContain(
			'no text layer'
		);
	});

	it('names a page by both of its page numbers', async () => {
		expect(textOf(await read({ document_id: 'd1', from: 3 }))).toContain(
			'p. 1 (PDF p. 3)'
		);
	});
});

describe('the tool schemas', () => {
	it('reject a page number below one', () => {
		expect(
			tools.read_pages.input.safeParse({ document_id: 'd', from: 0 })
				.success
		).toBe(false);
	});

	it('reject an empty quote', () => {
		expect(
			tools.verify_citation.input.safeParse({
				document_id: 'd',
				page_no: 1,
				quote: '',
			}).success
		).toBe(false);
	});
});

describe('verify_citation', () => {
	it('verifies a quote that runs across the page break', async () => {
		expect(
			await verify(
				'is a decadent civilization. a civilization that chooses to close its eyes'
			)
		).toMatchObject({ status: 'verified' });
	});

	it('reports a quote the page does not support', async () => {
		expect(
			await verify(
				'the owl of Minerva spreads its wings only with the falling'
			)
		).toEqual({ status: 'unverified', reason: 'not_found' });
	});
});

describe('a tool that cannot answer', () => {
	it('raises ToolUnavailableError rather than failing', async () => {
		const library = fakeLibrary({
			searchPages: () => {
				throw new ToolUnavailableError('No index yet.');
			},
		});
		await expect(
			tools.search_pages.call(library, { query: 'civilization' })
		).rejects.toBeInstanceOf(ToolUnavailableError);
	});
});
