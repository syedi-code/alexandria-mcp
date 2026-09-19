import type {
	Library,
	ListWorksInput,
	PageRef,
	PageText,
	PageView,
	SearchHit,
	SearchInput,
	WorkSummary,
} from '../src/library.js';

export const WORK: WorkSummary = {
	work_id: 'w1',
	title: 'Discourse on Colonialism',
	creator: 'Aimé Césaire',
	originally_published: '1950',
	documents: [
		{
			document_id: 'd1',
			label: null,
			page_count: 3,
			page_offset: 2,
			text: 'searchable',
			has_file: true,
		},
	],
};

const PAGES: Record<number, string | null> = {
	1: 'A civilization that proves incapable of solving the problems\nit creates is a decadent civilization.',
	2: 'a civilization that chooses to close its eyes to its most\ncrucial problems is a stricken civilization.',
	3: null,
};

function pageText(pageNo: number): PageText {
	return {
		ref: { document_id: 'd1', page_no: pageNo },
		work_id: WORK.work_id,
		work_title: WORK.title,
		creator: WORK.creator,
		printed_page: pageNo > 2 ? String(pageNo - 2) : null,
		text: PAGES[pageNo] ?? null,
	};
}

/** A library of one work, enough to exercise every tool. */
export function fakeLibrary(overrides: Partial<Library> = {}): Library {
	return {
		listWorks: async (input: ListWorksInput): Promise<WorkSummary[]> =>
			input.filter && !WORK.title.includes(input.filter) ? [] : [WORK],

		searchPages: async (input: SearchInput): Promise<SearchHit[]> =>
			Object.entries(PAGES)
				.filter(([, text]) => text?.includes(input.query))
				.map(([pageNo]) => ({
					...pageText(Number(pageNo)),
					snippet: `…«${input.query}»…`,
					score: -1,
				})),

		getPages: async (
			documentId: string,
			pageNos: readonly number[]
		): Promise<PageText[]> =>
			documentId === 'd1'
				? pageNos.filter((n) => n in PAGES).map(pageText)
				: [],

		viewPage: async (ref: PageRef): Promise<PageView> =>
			ref.page_no in PAGES
				? {
						ok: true,
						media_type: 'image/webp',
						data: new Uint8Array([1, 2, 3]),
					}
				: { ok: false, reason: 'no_such_page' },

		...overrides,
	};
}
