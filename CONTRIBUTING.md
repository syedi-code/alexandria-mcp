# Contributing

## Setup

```bash
npm install
npm test
```

Node is pinned in `.nvmrc`. There is no build step: Wrangler bundles the
TypeScript, and the package's entry points are the sources.

## Before opening a pull request

```bash
npm run lint
npx prettier --write .
npm run typecheck
npm test
```

CI runs exactly these four. `prettier --check` is one of them, so formatting
drift fails the build rather than burying someone's diff later.

## What matters here

**The boundary.** Nothing outside `src/d1/` and `src/worker/` may know where the
books are kept — not by import, not by type. `test/boundary.test.ts` holds it,
because nothing fails at runtime when it is crossed. A change that needs to
break it needs to argue for a fifth `Library` method instead.

**Tool descriptions and the reading practice are behaviour.** They are the
prompt. Changing a description changes what models do as surely as changing
code, and no test will notice. Say what you changed and why in the pull request.

**Citation matching is the point of the project.** `src/citations.ts` is the one
place where a bug is silently wrong rather than loudly broken: a quote that
verifies when it should not is worse than one that fails. Every change there
wants a test with a real example of the input — a real hyphenation, a real
running header — not a synthetic one.

**Adding a tool is one entry in `src/tools.ts`.** If it needs more than that,
say so in the pull request; it means the shape is wrong somewhere.

## Style

Prettier decides formatting; do not argue with it. Comments are for what the
code cannot say — a constraint, a hazard, a decision that looks arbitrary and is
not. A comment that restates the line below it will be removed.
