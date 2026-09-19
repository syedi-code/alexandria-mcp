/// <reference types="@cloudflare/workers-types" />
import type {
	DocumentTextStatus,
	ListWorksInput,
	WorkSummary,
} from '../library.js';

interface Row {
	work_id: string;
	title: string;
	creator: string;
	originally_published: string | null;
	document_id: string;
	label: string | null;
	page_count: number | null;
	page_offset: number;
	has_transcription: 0 | 1;
	has_text: 0 | 1;
	has_file: 0 | 1;
}

function textStatus(row: Row): DocumentTextStatus {
	if (row.has_text) return 'searchable';
	return row.has_transcription ? 'scan' : 'not_extracted';
}

/** Works that have at least one document, primary document first. */
export async function listWorks(
	db: D1Database,
	input: ListWorksInput
): Promise<WorkSummary[]> {
	// Each word must appear in the title or the creator, so "Césaire Discourse"
	// finds a work that no single column contains as a phrase.
	const terms = (input.filter ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 10);

	const { results } = await db
		.prepare(
			`WITH selected AS (
			     SELECT w.id FROM works w
			      WHERE w.deleted_at IS NULL
			        AND EXISTS (SELECT 1 FROM documents d WHERE d.work_id = w.id)
			        ${terms.map(() => `AND (w.title LIKE ? OR w.creator LIKE ?)`).join(' ')}
			      ORDER BY LOWER(w.creator), LOWER(w.title)
			      LIMIT ?
			 )
			 SELECT w.id AS work_id, w.title, w.creator, w.originally_published,
			        d.id AS document_id, d.label, d.page_count, d.page_offset,
			        d.current_transcription_id IS NOT NULL AS has_transcription,
			        d.r2_key IS NOT NULL AS has_file,
			        EXISTS (SELECT 1 FROM pages p
			                 WHERE p.transcription_id = d.current_transcription_id
			                   AND p.text IS NOT NULL) AS has_text
			   FROM selected s
			   JOIN works w ON w.id = s.id
			   JOIN documents d ON d.work_id = w.id
			  ORDER BY LOWER(w.creator), LOWER(w.title), d.is_primary DESC, d.created_at`
		)
		.bind(...terms.flatMap((t) => [`%${t}%`, `%${t}%`]), input.limit)
		.all<Row>();

	const works = new Map<string, WorkSummary>();
	for (const row of results ?? []) {
		const work = works.get(row.work_id) ?? {
			work_id: row.work_id,
			title: row.title,
			creator: row.creator,
			originally_published: row.originally_published,
			documents: [],
		};
		work.documents.push({
			document_id: row.document_id,
			label: row.label,
			page_count: row.page_count,
			page_offset: row.page_offset,
			text: textStatus(row),
			has_file: row.has_file === 1,
		});
		works.set(row.work_id, work);
	}
	return [...works.values()];
}
