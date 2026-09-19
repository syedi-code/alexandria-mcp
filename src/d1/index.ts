/// <reference types="@cloudflare/workers-types" />
import {
	ToolUnavailableError,
	type Library,
	type ListWorksInput,
	type PageRef,
	type SearchInput,
} from '../library.js';
import { getPages } from './pages.js';
import { viewPage } from './page-view.js';
import { searchPages } from './search.js';
import { listWorks } from './works.js';

export interface D1LibraryBindings {
	/** Works, documents and page text. */
	DB: D1Database;
	/**
	 * The FTS5 page index. Separate from `DB` because `wrangler d1 export`
	 * refuses a database with virtual tables, and the index is derived data.
	 * Without it, search_pages reports itself unavailable and nothing else
	 * changes.
	 */
	SEARCH?: D1Database;
	/** Source PDFs and rendered page images. Without it, view_page has no source. */
	R2_BUCKET?: R2Bucket;
}

/** A Library over Alexandria's D1 schema and R2 bucket. */
export function d1Library(env: D1LibraryBindings): Library {
	return {
		listWorks: (input: ListWorksInput) => listWorks(env.DB, input),
		searchPages: (input: SearchInput) => {
			if (!env.SEARCH) {
				throw new ToolUnavailableError(
					'Page search is not configured.'
				);
			}
			return searchPages(env.SEARCH, env.DB, input);
		},
		getPages: (documentId: string, pageNos: readonly number[]) =>
			getPages(env.DB, documentId, pageNos),
		viewPage: (ref: PageRef) => viewPage(env.DB, env.R2_BUCKET, ref),
	};
}

export { getPages, listWorks, searchPages, viewPage };
export { toMatchExpression } from './search.js';
export { documentObjectKey } from './rows.js';
export { MAX_SLICEABLE_PDF_BYTES, slicePdfPage } from './page-view.js';
