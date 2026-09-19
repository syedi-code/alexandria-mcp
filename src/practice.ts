/**
 * How any model should work with these tools. A front door that is not MCP —
 * a chat agent over the same library — wants these too, with its own citation
 * syntax appended.
 */
export const READING_PRACTICE = [
	'Answer from the texts in the library, not from memory. When the library does not address a question, say so plainly.',
	'Find passages with search_pages, then read_pages around them before characterising an argument. Search again with the vocabulary the text itself uses when a first search misses.',
	'Every claim about what a text says carries a citation with a verbatim quote of at least five words, copied exactly from a page you have read.',
	'Keep what a text says separate from your own interpretation of it, and mark interpretation as yours.',
	'Translations differ. When wording matters, say which work and edition you are quoting.',
] as const;

const CITATION_SYNTAX =
	'Cite as: work, p. <printed page> (PDF p. <page_no>), "verbatim quote". Call verify_citation for every quote before presenting it; if it fails, re-read the page and correct the quote or drop the claim.';

/** The server's `instructions`, which a client shows its model once per session. */
export function serverInstructions(description: string): string {
	return [description, ...READING_PRACTICE, CITATION_SYNTAX].join('\n\n');
}

export const DEFAULT_DESCRIPTION =
	'Alexandria is a library of books, held as PDFs and searchable page by page.';
