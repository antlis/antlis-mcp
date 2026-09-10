# antlis-mcp

MCP server for Anton's personal developer portfolio.

The goal is to make the portfolio queryable by AI assistants through the Model Context Protocol.

## Stack

* TypeScript
* Bun
* MCP
* `@modelcontextprotocol/server`
* `mcp-handler`
* Zod
* Vercel
* GitHub API
* MDX
* `gray-matter`

## Commands

```bash
bun install
bun run dev
bun run typecheck
bun x vercel --prod
```

Local MCP endpoint:

```text
http://localhost:3000/api/mcp
```

Production:

```text
https://antlis-mcp.vercel.app/api/mcp
```

## Architecture

```text
AI client
   │
   │ MCP / Streamable HTTP
   ▼
api/mcp.ts
   │
   ▼
mcp-handler
   │
   ├── tools
   │
   ▼
src/data/
   │
   ▼
GitHub API
   │
   ▼
antlis/antlis.github.io
```

Keep these responsibilities separate:

* `api/mcp.ts` — MCP/Vercel entrypoint
* `src/tools/` — MCP tool definitions
* `src/data/` — data loading, parsing, and search
* `src/data/about.ts` — static information about Anton

Do not put GitHub fetching or business logic directly in `api/mcp.ts`.

## Portfolio source

The portfolio repository is:

```text
https://github.com/antlis/antlis.github.io
```

It is the **source of truth** for portfolio content.

Projects live under:

```text
src/content/projects/
```

English project files use:

```text
<slug>.mdx
```

Russian translations use:

```text
<slug>-ru.mdx
```

The MCP server currently indexes the English files only.

Do not duplicate portfolio content in this repository.

## Current tools

### `about_me`

Returns high-level professional information.

Implementation:

```text
src/tools/about.ts
```

### `search_projects`

Searches projects by title, description, stack, scope, highlights, outcome, improvements, and content.

### `get_project`

Returns detailed information about one project by slug.

Example:

```text
tg-mpv-bot
```

Project tools are implemented in:

```text
src/tools/projects.ts
```

Project loading/searching is implemented in:

```text
src/data/projects.ts
```

## Adding tools

New MCP tools should:

1. Live in `src/tools/`.
2. Keep data/retrieval logic in `src/data/`.
3. Use Zod input schemas.
4. Be registered from `api/mcp.ts`.
5. Return concise, AI-readable results.
6. Be tested locally.
7. Pass `bun run typecheck`.
8. Be verified after production deployment.

Prefer tools that answer meaningful questions rather than simply exposing internal data structures.

## Important Vercel detail

Local TypeScript imports currently require `.ts` extensions.

Use:

```ts
import { registerProjectsTool } from '../src/tools/projects.ts'
```

Not:

```ts
import { registerProjectsTool } from '../src/tools/projects'
```

The extensionless version previously caused the production Vercel Node ESM runtime to fail with `ERR_MODULE_NOT_FOUND`.

Do not remove `.ts` extensions without verifying a production deployment.

## Data loading

`src/data/projects.ts` currently:

1. Fetches the GitHub repository tree.
2. Discovers project MDX files.
3. Fetches the raw files.
4. Parses frontmatter with `gray-matter`.
5. Normalizes them into the `Project` interface.
6. Caches the loaded projects in memory.

Do not introduce a database or other persistent storage unless there is a concrete requirement.

## Search

Current project search is intentionally simple text matching.

Searchable fields include:

* title
* description
* stack
* scope
* highlights
* outcome
* improvements
* content

Do not introduce embeddings, vector databases, or external search infrastructure prematurely.

First make the simple approach good enough.

## Tool response guidelines

Responses should provide enough context for an AI client to answer a user's question without knowing this codebase.

Prefer:

```json
{
  "slug": "tg-mpv-bot",
  "title": "Telegram MPV Bot",
  "stack": ["Python", "aiogram", "mpv", "yt-dlp"]
}
```

over opaque IDs or implementation-specific data.

`search_*` tools should generally return concise metadata.

`get_*` tools can return the complete resource.

## Planned work

Priority:

1. `search_blog`
2. `get_article`
3. `recommend_for_role`
4. MCP resources
5. MCP prompts

The interesting long-term use case is questions such as:

```text
Which projects are most relevant for a Senior React position?
```

and:

```text
What has Anton written about AI coding agents?
```

Recommendations should be derived from portfolio data rather than hardcoded project lists.

## Keep it simple

Do not add infrastructure without a demonstrated need.

Avoid prematurely introducing:

* databases
* Redis
* vector databases
* embeddings
* queues
* background workers
* authentication
* write access

The intended architecture is currently:

```text
GitHub → MCP server → AI client
```

## Security

The public MCP server is read-only.

Do not add tools that can:

* modify GitHub repositories
* deploy applications
* access private accounts
* expose credentials
* expose private personal information

## Before finishing a change

Run:

```bash
bun run typecheck
git status
```

For MCP changes, verify that the tool appears in:

```text
tools/list
```

For deployment changes, verify:

```bash
bun x vercel --prod
```

and test:

```text
https://antlis-mcp.vercel.app/api/mcp
```

Keep commits focused and avoid unrelated changes.
