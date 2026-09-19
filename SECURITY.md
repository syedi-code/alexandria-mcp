# Security

## Reporting

Open a
[private security advisory](https://github.com/syedi-code/alexandria-mcp/security/advisories/new).
Please do not open a public issue for a vulnerability.

There is no bounty and no SLA. Reports are read and answered as time allows.

## What the server assumes

Everything it serves is readable by anyone who can reach it. There is no
per-caller scoping, no ownership model, and no way to expose part of a library:
a caller who can call one tool can read every page of every document the
`Library` returns. Authorisation is entirely the deployment's, in front of the
worker.

Two things carry the weight, and are the places to look first:

**Cloudflare Access is the door.** `src/worker/access.ts` does not trust that
the edge is configured the way we think it is: it verifies the signed assertion
against the team domain's JWKS, checks the audience is the application it
expects, and checks the token named in `common_name` is the one service token
allowed. Any of `TEAM_DOMAIN`, `MCP_POLICY_AUD` or `MCP_SERVICE_TOKEN_ID`
missing makes the route answer `503`, never serve unauthenticated.

**`LOCAL_DEV` stands in for Access on a developer's machine.** Nothing in a
request distinguishes a local worker from a deployed one — both obvious runtime
checks were tried — so the variable is trusted at runtime and is only as safe as
the place it is set. It belongs in `.dev.vars` and nowhere else. Setting it as a
deployed secret makes the endpoint public.

## Known limits

Understood and accepted for a single-token deployment. Each would need work
before the Access policy admitted a second holder:

- **No rate limiting and no quota.** A token holder can read the library as fast
  as Cloudflare will carry it. The token is trusted because the deployment
  issues exactly one.
- **`view_page` pulls whole PDFs into the isolate** to cut one page out, for
  documents with no rendered page image. Anything over 24 MB refuses rather than
  exhausting the isolate, which bounds the damage but is not a quota.
- **Errors are not sanitised.** An exception that is not a
  `ToolUnavailableError` propagates to the transport, and its message may
  describe storage. With one trusted caller this is a debugging aid; with more
  it is disclosure.
- **Nothing is logged.** There is no audit trail of what was read.

## What is not a risk here

The server has no write path. Every tool is read-only and annotated as such, the
`Library` port has no mutating method, and there is nothing a caller can send
that changes stored state. Prompt injection from page text is a risk to the
_model reading it_, not to this server; a client should treat page text as data,
which is what the reading practice tells the model to do.
