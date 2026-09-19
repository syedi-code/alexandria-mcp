/// <reference types="@cloudflare/workers-types" />
import type { PageText } from '../library.js';
import {
	PAGE_TEXT_SELECT,
	placeholders,
	toPageText,
	type PageTextRow,
} from './rows.js';

/** Named pages of one document, in any order; missing pages are simply absent. */
export async function getPages(
	db: D1Database,
	documentId: string,
	pageNos: readonly number[]
): Promise<PageText[]> {
	const unique = [...new Set(pageNos)];
	if (unique.length === 0) return [];
	const { results } = await db
		.prepare(
			`${PAGE_TEXT_SELECT}
			 WHERE d.id = ? AND p.page_no IN (${placeholders(unique)})`
		)
		.bind(documentId, ...unique)
		.all<PageTextRow>();
	return (results ?? []).map(toPageText);
}
