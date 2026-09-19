# alexandria-mcp

An MCP server over a library of books held as PDFs and searchable page by page.

It gives a model five read-only tools and one habit: **quote the page, then
check the quote against it**. `verify_citation` matches a quote through
everything a PDF does to text — ligatures, diacritics, hyphens at line breaks,
scholarly ellipsis, and the join between one page and the next — and
distinguishes a quote the page does not support from one that begins there and
diverges.

| Tool              |                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| `list_works`      | What the library holds, with each work's documents and whether they are searchable |
| `search_pages`    | Keyword search over every page, with a snippet around the match                    |
| `read_pages`      | Up to five consecutive pages of one document, as text                              |
| `view_page`       | One page as it looks on paper, for scans, Greek, tables and bad extraction         |
| `verify_citation` | Whether a quote really appears on the page it is attributed to                     |

## The hosted server

One instance is hosted, over one person's library:

```
https://alexandria.socialeating.studio/api/mcp
```

**It is not open to the public, and there is no sign-up.** It sits behind a
Cloudflare Access application whose only policy admits a single service token,
held by the maintainer. Access rejects a request without that token before the
worker sees it. It serves one person's library and is not offered to anyone
else.

What is open is this repository. Point it at your own library and the same tools
work. See [`docs/HOSTING.md`](docs/HOSTING.md) for both — how the hosted
instance is locked, and how to run your own.

## Using it

```bash
npm install
npm test
npm run dev     # the worker on :8787, with LOCAL_DEV=true in .dev.vars
```

Connecting a client — Claude Code, Claude Desktop, anything that speaks
Streamable HTTP — is [`docs/CONNECTING.md`](docs/CONNECTING.md).

## The architecture, in one diagram

```text
src/
├── library.ts   the port: four methods, no storage of any kind
├── tools.ts     the five tools, against the port
├── citations.ts quote matching, which is the whole point
├── server.ts    the MCP server
├── d1/          a Library over Cloudflare D1 and R2
└── worker/      a Cloudflare Worker serving it behind Access
```

Everything above `d1/` and `worker/` is storage-agnostic. A `Library` is four
methods — list works, search pages, get named pages, view a page — and
`read_pages` and `verify_citation` are built on them here rather than asked of
the implementation. So the semantics that matter are the same whatever the books
are kept in, and an implementation has nothing to get subtly wrong.

Nothing fails at runtime when that is violated, so it is held by a test
(`test/boundary.test.ts`) that no file outside the adapters names a Cloudflare
binding. Treat it as production code.

Writing your own library, or adding a sixth tool, is
[`docs/EXTENDING.md`](docs/EXTENDING.md).

## Where this came from

It was part of
[alexandria](https://github.com/syedi-code/alexandria.socialeating.studio),
which is still the backend the hosted instance runs inside — that deployment
serves `/api/mcp` from its own worker, with the same tools and the same Access
policy. This repository is where the server is developed, and what you get if
you want one of your own.

## License

ISC.
