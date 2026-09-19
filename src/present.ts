import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { isViewable, type PageRef, type PageView } from './library.js';

export const text = (value: string): CallToolResult => ({
	content: [{ type: 'text', text: value }],
});

export const failure = (value: string): CallToolResult => ({
	isError: true,
	...text(value),
});

export const json = (value: unknown): CallToolResult =>
	text(JSON.stringify(value, null, 2));

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

/**
 * An image if the page is one, otherwise an embedded resource — a client that
 * cannot render a PDF can still hand it to the model or show a download.
 */
export function page(view: PageView, ref: PageRef): CallToolResult {
	if (!isViewable(view)) {
		return failure(`This page cannot be viewed: ${view.reason}.`);
	}
	const data = toBase64(view.data);
	if (view.media_type.startsWith('image/')) {
		return {
			content: [{ type: 'image', data, mimeType: view.media_type }],
		};
	}
	return {
		content: [
			{
				type: 'resource',
				resource: {
					uri: `alexandria://documents/${ref.document_id}/pages/${ref.page_no}`,
					mimeType: view.media_type,
					blob: data,
				},
			},
		],
	};
}
