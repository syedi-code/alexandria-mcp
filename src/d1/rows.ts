/// <reference types="@cloudflare/workers-types" />
import { printedPage, type PageText } from '../library.js';

/**
 * Column shapes shared by the D1 queries. The adapter reads Alexandria's
 * schema: `works`, `documents`, `pages`, and — in a second database — the FTS5
 * index `page_search` with its `indexed_documents` companion.
 */

export interface PageTextRow {
	document_id: string;
	page_no: number;
	text: string | null;
	page_offset: number;
	work_id: string;
	work_title: string;
	creator: string;
}

export const PAGE_TEXT_SELECT = `
	SELECT d.id AS document_id, p.page_no, p.text, d.page_offset,
	       w.id AS work_id, w.title AS work_title, w.creator
	  FROM documents d
	  JOIN works w ON w.id = d.work_id
	  JOIN pages p ON p.transcription_id = d.current_transcription_id`;

export function toPageText(row: PageTextRow): PageText {
	return {
		ref: { document_id: row.document_id, page_no: row.page_no },
		work_id: row.work_id,
		work_title: row.work_title,
		creator: row.creator,
		printed_page: printedPage(row.page_no, row.page_offset),
		text: row.text,
	};
}

export const placeholders = (values: readonly unknown[]) =>
	values.map(() => '?').join(', ');

/** Bucket keys are stored with the path prefix the API serves them under. */
export function documentObjectKey(r2Key: string): string {
	return r2Key.replace(/^\/?(api\/)?files\//, '').replace(/^\/+/, '');
}
