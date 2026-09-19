import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { verifyCitation } from './citations.js';
import {
	type Library,
	type PageText,
	type PageView,
	type SearchHit,
	type WorkSummary,
} from './library.js';
import * as present from './present.js';
import { describePage, renderPages, renderSearchHits } from './render.js';

/**
 * The library as tools a model can use. Each tool owns its description, its
 * input schema, what it does, and how its answer is shown — so adding one is
 * a single entry here and nothing else.
 */

export const MAX_PAGES_PER_READ = 5;
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 25;
export const DEFAULT_WORKS_LIMIT = 50;
export const MAX_WORKS_LIMIT = 200;

/** A tool as the server uses it, with its input and output types spent. */
export interface Tool {
	/** Written for the model, not for a reader of the code. */
	description: string;
	input: z.ZodObject<z.ZodRawShape>;
	call(library: Library, input: unknown): Promise<CallToolResult>;
}

interface ToolDefinition<Schema extends z.ZodObject<z.ZodRawShape>, Output> {
	description: string;
	input: Schema;
	run(library: Library, input: z.infer<Schema>): Promise<Output>;
	present(output: Output, input: z.infer<Schema>): CallToolResult;
}

/**
 * Checks a definition against its own schema, then erases both types. Without
 * the erasure every caller of the tool table carries a union of five unrelated
 * output types, and none of them narrows.
 */
function defineTool<Schema extends z.ZodObject<z.ZodRawShape>, Output>(
	tool: ToolDefinition<Schema, Output>
): Tool {
	return {
		description: tool.description,
		input: tool.input,
		async call(library, input) {
			const args = input as z.infer<Schema>;
			return tool.present(await tool.run(library, args), args);
		},
	};
}

const documentId = z
	.string()
	.min(1)
	.max(100)
	.describe('Document id, from list_works or search_pages');

const pageNo = z
	.number()
	.int()
	.min(1)
	.describe('1-based PDF page index — not the printed page number');

/** Where a page sits, plus the ids needed to read or cite it. */
const locate = (page: Omit<PageText, 'text'>) =>
	`${describePage(page)} [document_id ${page.ref.document_id}, page_no ${page.ref.page_no}]`;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export const tools = {
	list_works: defineTool({
		description:
			'List works in the library with their documents (a work can exist as several editions or translations). Use it to find out what the library holds before searching. A document whose text is "scan" cannot be searched; read it with view_page.',
		input: z.object({
			filter: z
				.string()
				.max(200)
				.optional()
				.describe('Matches title or creator'),
			limit: z.number().int().min(1).max(MAX_WORKS_LIMIT).optional(),
		}),
		run: (library, input): Promise<WorkSummary[]> =>
			library.listWorks({
				filter: input.filter,
				limit: clamp(
					input.limit ?? DEFAULT_WORKS_LIMIT,
					1,
					MAX_WORKS_LIMIT
				),
			}),
		present: present.json,
	}),

	search_pages: defineTool({
		description:
			'Keyword search across the text of every page in the library. Returns pages with a short snippet around the match. Search for the exact terms a text would use — terms of art, names, distinctive phrases in "quotes" — and search again with different words if the first results miss. Snippets are too short to quote from; read the page.',
		input: z.object({
			query: z.string().min(1).max(500),
			work_ids: z.array(z.string().max(100)).max(20).optional(),
			document_ids: z.array(z.string().max(100)).max(20).optional(),
			limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
		}),
		run: (library, input): Promise<SearchHit[]> =>
			library.searchPages({
				...input,
				limit: clamp(
					input.limit ?? DEFAULT_SEARCH_LIMIT,
					1,
					MAX_SEARCH_LIMIT
				),
			}),
		present: (hits) => present.text(renderSearchHits(hits, locate)),
	}),

	read_pages: defineTool({
		description: `Read the full text of up to ${MAX_PAGES_PER_READ} consecutive pages of one document. Read the pages around a passage before characterising an argument; arguments rarely fit on one page.`,
		input: z.object({
			document_id: documentId,
			from: pageNo,
			to: pageNo.optional(),
		}),
		run: async (library, input): Promise<PageText[]> => {
			const from = Math.max(1, input.from);
			const to = clamp(
				input.to ?? from,
				from,
				from + MAX_PAGES_PER_READ - 1
			);
			const wanted = Array.from(
				{ length: to - from + 1 },
				(_, i) => from + i
			);
			const pages = await library.getPages(input.document_id, wanted);
			return pages.sort((a, b) => a.ref.page_no - b.ref.page_no);
		},
		present: (pages) => present.text(renderPages(pages, locate)),
	}),

	view_page: defineTool({
		description:
			'See one page as it looks on paper. Use it for scanned documents, Greek or other scripts, footnotes, tables, or when extracted text looks garbled.',
		input: z.object({ document_id: documentId, page_no: pageNo }),
		run: (library, input): Promise<PageView> => library.viewPage(input),
		present: (view, input) => present.page(view, input),
	}),

	verify_citation: defineTool({
		description:
			'Check that a quote really appears on a page (or runs from it onto the next). Call it for every quote before presenting it.',
		input: z.object({
			document_id: documentId,
			page_no: pageNo,
			quote: z.string().min(1).max(2000),
		}),
		run: (library, { quote, ...ref }) =>
			verifyCitation(library, { ref, quote }),
		present: (check) => present.text(JSON.stringify(check)),
	}),
};

export type ToolName = keyof typeof tools;
