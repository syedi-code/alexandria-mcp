import { describe, expect, it } from 'vitest';
import { checkQuote, normalizeForMatching } from '../src/citations.js';
import type { PageText } from '../src/library.js';

const page = (text: string | null, page_no = 1): PageText => ({
	ref: { document_id: 'd1', page_no },
	work_id: 'w1',
	work_title: 'A Work',
	creator: 'A Creator',
	printed_page: String(page_no),
	text,
});

describe('normalizeForMatching', () => {
	it('folds diacritics, ligatures and punctuation to bare words', () => {
		expect(normalizeForMatching('Æsop’s “Œuvres” — Beiträge!')).toBe(
			'aesop s oeuvres beitrage'
		);
	});

	it('joins a word broken across a line, and can split instead', () => {
		expect(normalizeForMatching('self-\ndeception')).toBe('selfdeception');
		expect(normalizeForMatching('self-\ndeception', 'split')).toBe(
			'self deception'
		);
	});
});

describe('checkQuote', () => {
	const text =
		'The philosophers have only interpreted the world, in various ways; the point is to change it.';

	it('verifies a quote whatever the PDF did to its punctuation', () => {
		expect(
			checkQuote(
				'philosophers have only inter-\npreted the world, in various ways',
				page(text)
			)
		).toEqual({ status: 'verified', matched: [page(text).ref] });
	});

	it('verifies a quote that elides words', () => {
		expect(
			checkQuote(
				'The philosophers have only interpreted the world... the point is to change it',
				page(text)
			).status
		).toBe('verified');
	});

	it('refuses a quote too short to be evidence', () => {
		expect(checkQuote('the world', page(text))).toEqual({
			status: 'unverified',
			reason: 'quote_too_short',
		});
	});

	it('distinguishes a quote that begins on the page from one that does not', () => {
		expect(
			checkQuote(
				'The philosophers have only interpreted the flatiron building',
				page(text)
			)
		).toEqual({ status: 'unverified', reason: 'partial_match' });
	});

	it('is unverifiable, not unverified, without a text layer', () => {
		expect(checkQuote('anything at all whatsoever', page(null))).toEqual({
			status: 'unverifiable',
			reason: 'no_text_layer',
		});
	});
});
