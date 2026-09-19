# Extending

## Writing a Library

A library is four methods:

```ts
import type { Library } from 'alexandria-mcp';

const library: Library = {
	listWorks: async ({ filter, limit }) => [...],
	searchPages: async ({ query, work_ids, document_ids, limit }) => [...],
	getPages: async (documentId, pageNos) => [...],
	viewPage: async ({ document_id, page_no }) => ({ ok: false, reason: 'no_source' }),
};
```

That is the whole port. `read_pages` is a clamped range over `getPages`, and
`verify_citation` is a quote matched against the pages `getPages` returns, both
implemented here — so the two things most easily got wrong are not yours to get
wrong. Input has already been validated and clamped against the tool schemas
before it reaches you.

Three conventions carry meaning:

- **`page_no` is the 1-based PDF page**, never the number printed on the paper.
  The printed number is derived: `printed = page_no - page_offset`, and pages
  before printed page 1 have none. Return it as `printed_page`.
- **`text: null` means the page has no text layer**, which is not the same as an
  empty page. `verify_citation` answers `unverifiable`, not `unverified`, for
  such a page — the difference between "I cannot check this" and "this is
  wrong".
- **A tool that cannot answer raises `ToolUnavailableError`**, with a sentence
  the model can act on. The server turns it into a tool error rather than a
  failure, so the model reads it and adapts. Anything else thrown is a bug and
  propagates.

Then serve it:

```ts
import { createAlexandriaMcp } from 'alexandria-mcp';

const server = createAlexandriaMcp(library, {
	description: 'The collected papers of one physicist, as scans.',
});
```

## Adding a tool

One entry in `src/tools.ts`:

```ts
const tools = {
	cite_work: defineTool({
		description: 'Written for the model, not for a reader of the code.',
		input: z.object({ work_id: z.string().min(1).max(100) }),
		run: (library, input) => library.listWorks({ filter: input.work_id }),
		present: (works) => present.json(works),
	}),
};
```

`defineTool` type-checks `run` and `present` against the schema and then erases
both types, so nothing downstream carries a union of every tool's output. The
server registers whatever is in the table; there is no second list to update.

Reach for a new `Library` method only when the tool genuinely needs data the
four cannot express. Every method added is one more thing every implementation
has to get right.

## Changing what the model is told

`src/practice.ts` holds the reading practice, which is sent as the server's
`instructions` and is deliberately separate from any one front door — a chat
agent over the same library wants the same five sentences with its own citation
syntax appended. `serverInstructions(description)` composes them.

Tool descriptions live with their tools. Both are prompt text: changing them
changes behaviour as surely as changing code, and neither is covered by a test
that would notice.
