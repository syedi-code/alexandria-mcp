import type { PageText, SearchHit } from './library.js';

/** How a page is named to the model: work, creator, and where it sits. */
export function describePage(page: Omit<PageText, 'text'>): string {
	const location = page.printed_page
		? `p. ${page.printed_page} (PDF p. ${page.ref.page_no})`
		: `PDF p. ${page.ref.page_no}`;
	return `${page.work_title} — ${page.creator} — ${location}`;
}

/** Pages as the model reads them: a heading naming each page, then its text. */
export function renderPages<Page extends PageText>(
	pages: readonly Page[],
	heading: (page: Page) => string
): string {
	if (pages.length === 0) return 'No such pages.';
	return pages
		.map(
			(page) =>
				`${heading(page)}\n${page.text ?? '[This page has no text layer. Use view_page to see it.]'}`
		)
		.join('\n\n---\n\n');
}

export function renderSearchHits<Hit extends SearchHit>(
	hits: readonly Hit[],
	heading: (hit: Hit) => string
): string {
	if (hits.length === 0) return 'No pages matched.';
	return hits.map((hit) => `${heading(hit)}\n${hit.snippet}`).join('\n\n');
}
