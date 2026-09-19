import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { createAlexandriaMcp } from '../src/server.js';
import { ToolUnavailableError } from '../src/library.js';
import { fakeLibrary } from './fake-library.js';

async function connect(library = fakeLibrary()): Promise<Client> {
	const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: 'test', version: '0' });
	await Promise.all([
		createAlexandriaMcp(library).connect(serverSide),
		client.connect(clientSide),
	]);
	return client;
}

describe('the server', () => {
	let client: Client;
	beforeAll(async () => {
		client = await connect();
	});

	it('offers every tool, and every one of them read-only', async () => {
		const { tools } = await client.listTools();
		expect(tools.map((t) => t.name).sort()).toEqual([
			'list_works',
			'read_pages',
			'search_pages',
			'verify_citation',
			'view_page',
		]);
		expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
	});

	it('tells the model to cite what it quotes', () => {
		expect(client.getInstructions()).toContain('verify_citation');
	});

	it('names a page by work, creator and both page numbers', async () => {
		const result = await client.callTool({
			name: 'read_pages',
			arguments: { document_id: 'd1', from: 3 },
		});
		expect(result.content).toMatchObject([
			{ text: expect.stringContaining('p. 1 (PDF p. 3)') },
		]);
	});

	it('returns a rendered page as an image', async () => {
		const result = await client.callTool({
			name: 'view_page',
			arguments: { document_id: 'd1', page_no: 1 },
		});
		expect(result.content).toMatchObject([
			{ type: 'image', mimeType: 'image/webp' },
		]);
	});

	it('refuses input the schema does not allow, without reaching the library', async () => {
		const result = await client.callTool({
			name: 'read_pages',
			arguments: { document_id: 'd1', from: 0 },
		});
		expect(result.isError).toBe(true);
		expect(result.content).toMatchObject([
			{ text: expect.stringContaining('validation') },
		]);
	});
});

describe('a tool that cannot answer', () => {
	it('tells the model why, as a tool error rather than a transport one', async () => {
		const client = await connect(
			fakeLibrary({
				searchPages: () => {
					throw new ToolUnavailableError('No index yet.');
				},
			})
		);
		const result = await client.callTool({
			name: 'search_pages',
			arguments: { query: 'civilization' },
		});
		expect(result.isError).toBe(true);
		expect(result.content).toMatchObject([{ text: 'No index yet.' }]);
	});
});
