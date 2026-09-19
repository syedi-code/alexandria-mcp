/**
 * What the MCP server needs from a library, and nothing more.
 *
 * Everything the model sees is built on these four methods: `read_pages` is a
 * clamped range over `getPages`, and `verify_citation` is a quote matched
 * against the pages `getPages` returns. An implementation supplies data
 * access; this package owns what the tools mean.
 */

/** A page is always named by its document and 1-based PDF page index. */
export interface PageRef {
	document_id: string;
	page_no: number;
}

/**
 * - `searchable`: the current transcription has text.
 * - `scan`: it was extracted and has none — readable only as images.
 * - `not_extracted`: no transcription yet.
 */
export type DocumentTextStatus = 'searchable' | 'scan' | 'not_extracted';

export interface DocumentSummary {
	document_id: string;
	label: string | null;
	page_count: number | null;
	/** `pdf_page = printed_page + page_offset`. */
	page_offset: number;
	text: DocumentTextStatus;
	/** Whether a file backs it. A document can exist before its upload. */
	has_file: boolean;
}

export interface WorkSummary {
	work_id: string;
	title: string;
	creator: string;
	originally_published: string | null;
	documents: DocumentSummary[];
}

export interface PageText {
	ref: PageRef;
	work_id: string;
	work_title: string;
	creator: string;
	printed_page: string | null;
	/** Null when the page has no text layer. */
	text: string | null;
}

export interface SearchHit {
	ref: PageRef;
	work_id: string;
	work_title: string;
	creator: string;
	printed_page: string | null;
	/** Around the best match, with matched terms wrapped in «guillemets». */
	snippet: string;
	/** bm25; lower is a better match. */
	score: number;
}

export type ViewablePage = { ok: true; media_type: string; data: Uint8Array };
export type UnviewablePage = {
	ok: false;
	reason: 'no_such_page' | 'no_source' | 'too_large';
};
export type PageView = ViewablePage | UnviewablePage;

export const isViewable = (view: PageView): view is ViewablePage => view.ok;

export interface ListWorksInput {
	filter?: string;
	limit?: number;
}

export interface SearchInput {
	query: string;
	work_ids?: string[];
	document_ids?: string[];
	limit?: number;
}

export interface Library {
	/** Works that have at least one document, primary document first. */
	listWorks(input: ListWorksInput): Promise<WorkSummary[]>;
	/** Keyword search over page text. */
	searchPages(input: SearchInput): Promise<SearchHit[]>;
	/** Named pages of one document, in any order; missing pages are absent. */
	getPages(
		documentId: string,
		pageNos: readonly number[]
	): Promise<PageText[]>;
	/** One page as it looks on paper. */
	viewPage(ref: PageRef): Promise<PageView>;
}

/**
 * A tool that cannot answer right now, for a reason the caller can act on —
 * distinct from a tool that failed. The server turns it into a message to the
 * model rather than an error.
 */
export class ToolUnavailableError extends Error {}

/**
 * The page number printed on the paper. Front matter before printed page 1
 * has none.
 */
export function printedPage(pageNo: number, pageOffset: number): string | null {
	const printed = pageNo - pageOffset;
	return printed >= 1 ? String(printed) : null;
}
