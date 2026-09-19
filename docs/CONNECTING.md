# Connecting a client

The server speaks MCP over Streamable HTTP and holds no session between
requests, so any client that can send two headers can use it.

Substitute your own endpoint and the client id and secret of your service token.

## Claude Code

```bash
claude mcp add --transport http alexandria https://example.com/mcp \
  --header "CF-Access-Client-Id: <client id>" \
  --header "CF-Access-Client-Secret: <client secret>"
```

## Claude Desktop

Its connector screen cannot send headers, so use the config file and the
`mcp-remote` bridge:

```json
{
	"mcpServers": {
		"alexandria": {
			"command": "npx",
			"args": [
				"-y",
				"mcp-remote",
				"https://example.com/mcp",
				"--header",
				"CF-Access-Client-Id:<client id>",
				"--header",
				"CF-Access-Client-Secret:<client secret>"
			]
		}
	}
}
```

## Anything else

Send both headers on every request to the endpoint. Cloudflare Access exchanges
them for the signed assertion the worker checks, so a client that cannot set
headers cannot connect — there is no query-parameter or bearer-token
alternative.

## Locally

With `LOCAL_DEV=true` in `.dev.vars`, `npm run dev` serves
`http://localhost:8787/mcp` with no headers at all:

```bash
claude mcp add --transport http alexandria-dev http://localhost:8787/mcp
```

## What a client sees

The server sends `instructions` once, at initialization: a sentence describing
the library, then the reading practice — search, read around the passage, quote
verbatim, say which edition, verify every quote. Clients that surface
`instructions` to the model get citation discipline without any prompting of
your own. Clients that ignore them still get the same discipline in each tool's
description, which is written for the model rather than for a reader of the
code.

Every tool is annotated `readOnlyHint`, so a client with an approval flow can
let all five run without asking.
