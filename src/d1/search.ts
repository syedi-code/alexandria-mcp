/// <reference types="@cloudflare/workers-types" />
import {
	printedPage,
	ToolUnavailableError,
	type SearchHit,
	type SearchInput,
} from '../library.js';
import { placeholders } from './rows.js';

const FTS_OPERATORS = new Set(['AND', 'OR', 'NOT', 'NEAR']);

/**
 * Turns free text into an FTS5 expression that cannot be a syntax error:
 * `"quoted phrases"` stay phrases, every other word is quoted on its own, and
 * all terms are OR-ed so bm25 ranks pages that match more of them higher.
 */
export function toMatchExpression(query: string): string | null {
	const terms: string[] = [];
	const phrase = /"([^"]*)"/g;

	for (const [, text] of query.matchAll(phrase)) {
		const words = text?.match(/[\p{L}\p{N}]+/gu);
		if (words) terms.push(words.join(' '));
	}
	for (const word of query.replace(phrase, ' ').match(/[\p{L}\p{N}]+/gu) ??
		[]) {
		if (!FTS_OPERATORS.has(word)) terms.push(word);
	}

	const unique = [...new Set(terms)];
	return unique.length ? unique.map((t) => `"${t}"`).join(' OR ') : null;
}

interface HitRow {
	document_id: string;
	page_no: number;
	snippet: string;
	score: number;
}

interface DocumentWorkRow {
	document_id: string;
	page_offset: number;
	work_id: string;
	work_title: string;
	creator: string;
}

async function documentsForWorks(
	db: D1Database,
	workIds: readonly string[]
): Promise<string[]> {
	const { results } = await db
		.prepare(
			`SELECT id FROM documents WHERE work_id IN (${placeholders(workIds)})`
		)
		.bind(...workIds)
		.all<{ id: string }>();
	return (results ?? []).map((r) => r.id);
}

/**
 * The index is built by the ingestion pipeline, which also creates its schema,
 * so both an empty index and a missing one mean the same thing: nobody has
 * built it yet. Saying so beats reporting "no matches" over an empty index.
 */
async function assertIndexBuilt(search: D1Database): Promise<void> {
	const indexed = await search
		.prepare(`SELECT COUNT(*) AS n FROM indexed_documents`)
		.first<{ n: number }>()
		.catch(() => null);
	if (!indexed?.n) {
		throw new ToolUnavailableError(
			'The page search index has not been built yet, so no page can be found by searching. Reading pages still works.'
		);
	}
}

/** A query against an index that may not exist yet. */
async function queryIndex(
	search: D1Database,
	sql: string,
	params: (string | number)[]
) {
	try {
		return await search
			.prepare(sql)
			.bind(...params)
			.all<HitRow>();
	} catch (error) {
		await assertIndexBuilt(search);
		throw error;
	}
}

/**
 * Keyword search over page text. `search` is the index database; `db` is the
 * main one, used to scope by work and to name what was found.
 */
export async function searchPages(
	search: D1Database,
	db: D1Database,
	input: SearchInput
): Promise<SearchHit[]> {
	const match = toMatchExpression(input.query);
	if (!match) return [];

	let scope = input.document_ids?.length ? [...input.document_ids] : null;
	if (input.work_ids?.length) {
		const fromWorks = await documentsForWorks(db, input.work_ids);
		scope = scope
			? scope.filter((id) => fromWorks.includes(id))
			: fromWorks;
		if (scope.length === 0) return [];
	}

	const { results: hits } = await queryIndex(
		search,
		`SELECT document_id, page_no,
		        snippet(page_search, 2, '«', '»', '…', 32) AS snippet,
		        bm25(page_search) AS score
		   FROM page_search
		  WHERE page_search MATCH ?
		  ${scope ? `AND document_id IN (${placeholders(scope)})` : ''}
		  ORDER BY score
		  LIMIT ?`,
		[match, ...(scope ?? []), input.limit ?? 10]
	);
	if (!hits?.length) {
		await assertIndexBuilt(search);
		return [];
	}

	const documentIds = [...new Set(hits.map((h) => h.document_id))];
	const { results: documents } = await db
		.prepare(
			`SELECT d.id AS document_id, d.page_offset,
			        w.id AS work_id, w.title AS work_title, w.creator
			   FROM documents d JOIN works w ON w.id = d.work_id
			  WHERE d.id IN (${placeholders(documentIds)})`
		)
		.bind(...documentIds)
		.all<DocumentWorkRow>();
	const byId = new Map((documents ?? []).map((d) => [d.document_id, d]));

	return hits.flatMap((hit) => {
		const document = byId.get(hit.document_id);
		if (!document) return [];
		return [
			{
				ref: { document_id: hit.document_id, page_no: hit.page_no },
				work_id: document.work_id,
				work_title: document.work_title,
				creator: document.creator,
				printed_page: printedPage(hit.page_no, document.page_offset),
				snippet: hit.snippet,
				score: hit.score,
			},
		];
	});
}
