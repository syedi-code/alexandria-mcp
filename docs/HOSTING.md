# Hosting

## The hosted instance

|                  |                                                                           |
| ---------------- | ------------------------------------------------------------------------- |
| Endpoint         | `https://alexandria.socialeating.studio/api/mcp`                          |
| Transport        | MCP over Streamable HTTP, stateless                                       |
| Runs on          | Cloudflare Workers, in the alexandria backend                             |
| Data             | Cloudflare D1 (works, documents, page text) and R2 (PDFs and page images) |
| Auth             | Cloudflare Access service token                                           |
| Who can reach it | The maintainer, and nobody else                                           |

### Who can access it, exactly

One Cloudflare Access application covers that path. It has one policy: action
**Service Auth**, including exactly one service token. Cloudflare rejects every
request that does not carry that token's client id and secret, at the edge,
before any code here runs. The worker then verifies the signed assertion itself
and checks that the token named in it is the one it expects — so a token issued
for a different Access application in the same account cannot be used here
either.

There is no OAuth, no registration, and no anonymous access. Access is granted
by handing someone the token, and revoked by deleting it, which takes effect
immediately for everyone holding it.

It serves one person's library and is not offered to anyone else. Running your
own instance over your own books is what this repository is for.

### What it can do

Every tool is read-only and annotated as such. There is no write path: nothing
in this server creates, edits or deletes anything. A caller can read page text,
see rendered pages, and check quotes.

What it does not do is bound the reading. There is no rate limit and no
per-token quota beyond Cloudflare's own; the token is trusted because only the
maintainer holds it. Widening the Access policy without adding limits would be a
mistake.

## Running your own

You need a Cloudflare account, a D1 database holding a library in
[alexandria's schema](https://github.com/syedi-code/alexandria), and an R2
bucket with the source PDFs. If you have books but not that schema, write your
own `Library` instead and skip D1 entirely — see [EXTENDING.md](EXTENDING.md).

### 1. Bindings

Copy the ids into `wrangler.toml`. `SEARCH` and `R2_BUCKET` are both optional:
without `SEARCH`, `search_pages` tells the model it is unavailable and the rest
works; without `R2_BUCKET`, `view_page` has no source.

`account_id` is deliberately not in the file. Set `CLOUDFLARE_ACCOUNT_ID` in
your environment, so a fork of this repository carries nobody's account.

### 2. Access

Cloudflare Zero Trust, in this order:

1. **Access → Service Auth → Service Tokens**: create one, e.g.
   `alexandria-mcp`. Keep the client id and secret; the secret is shown once.
2. **Access → Applications**: add a self-hosted application for the hostname and
   path your worker serves, `example.com/mcp`. Give it one policy: action
   **Service Auth**, include **Service Token → alexandria-mcp**. Copy the
   application's AUD tag.
3. Tell the worker which application and which token to trust:

    ```bash
    npx wrangler secret put TEAM_DOMAIN            # https://<team>.cloudflareaccess.com
    npx wrangler secret put MCP_POLICY_AUD         # the application's AUD tag
    npx wrangler secret put MCP_SERVICE_TOKEN_ID   # the token's client id
    ```

With any of the three unset the worker answers `503 MCP is not configured`
rather than serving without auth. That is deliberate: a misconfigured deployment
must not be an open one.

### 3. Deploy

```bash
npx wrangler deploy
```

## Local development

`LOCAL_DEV=true` in `.dev.vars` stands in for Access on your own machine, and
skips the token check entirely.

**Never set it as a deployed secret.** Nothing in a request distinguishes a
local worker from a deployed one — `wrangler dev` populates `request.cf` with
real geolocation and simulates the custom domain — so the variable is exactly as
trustworthy as the place it is set. It belongs in `.dev.vars`, which is
gitignored, and nowhere else.

## Costs

Reads are D1 row reads and R2 GETs. The expensive tool is `view_page` on a
document with no rendered page image: it pulls the whole PDF into the isolate to
cut one page out, which is why anything over 24 MB refuses instead. Giving pages
rendered images in the ingestion pipeline avoids that path altogether.
