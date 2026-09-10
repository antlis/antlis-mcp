# antlis-mcp

> MCP server that makes my developer portfolio queryable by AI assistants.

`antlis-mcp` exposes structured information about my projects, experience, and technical work through the [Model Context Protocol](https://modelcontextprotocol.io/).

Instead of an AI assistant having to crawl a portfolio website and infer relationships between projects and technologies, it can query the portfolio directly through MCP tools.

## Live endpoint

```text
https://antlis-mcp.vercel.app/api/mcp
```

The server is deployed as a Vercel serverless function.

## What can it do?

An MCP-compatible AI client can ask questions such as:

> What projects has Anton built with Telegram?

> Which projects demonstrate Node.js experience?

> What projects are relevant to a Senior React position?

> Tell me about the `tg-mpv-bot` project.

The MCP server turns these questions into structured queries against the portfolio data.

## Available tools

### `about_me`

Returns information about my professional background, primary technologies, and interests.

Example use:

```text
Tell me about Anton's technical background.
```

### `search_projects`

Searches my portfolio projects by technology, topic, description, engineering experience, or project content.

Example queries:

```text
React
```

```text
Telegram
```

```text
Node.js
```

```text
AI
```

```text
frontend architecture
```

The search currently performs lightweight text matching across project metadata and content.

### `get_project`

Returns detailed information about a specific portfolio project.

Example:

```text
get_project("tg-mpv-bot")
```

The result includes project metadata, technology stack, scope, highlights, outcome, links, and the full project description.

## Architecture

```text
                    ┌─────────────────────┐
                    │    AI assistant     │
                    │                     │
                    │ Claude / ChatGPT /  │
                    │ other MCP clients   │
                    └──────────┬──────────┘
                               │
                               │ MCP
                               ▼
                    ┌─────────────────────┐
                    │     antlis-mcp      │
                    │                     │
                    │  Vercel Function    │
                    │     /api/mcp        │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
          Portfolio data              MCP tools
          from GitHub                 ┌──────────────┐
                                      │ about_me     │
                                      │ search_projects│
                                      │ get_project  │
                                      └──────────────┘
                 │
                 ▼
       ┌─────────────────────┐
       │ antlis/             │
       │ antlis.github.io    │
       │                     │
       │ src/content/        │
       │   projects/*.mdx    │
       └─────────────────────┘
```

The MCP server does not duplicate the portfolio content.

Instead, it reads project data directly from the public GitHub repository for my portfolio:

```text
https://github.com/antlis/antlis.github.io
```

This means the portfolio remains the source of truth.

## Data flow

For project discovery, the server uses the GitHub Git Tree API to find project files:

```text
src/content/projects/*.mdx
```

Individual project files are then fetched from GitHub and parsed as MDX/frontmatter.

The resulting data is converted into a structured project model:

```ts
interface Project {
  slug: string
  title: string
  description: string
  category: string
  imgSrc?: string
  imgAlt?: string
  href?: string
  blogHref?: string
  stack: string[]
  year: string
  scope: string[]
  highlights: string[]
  outcome?: string
  improvements?: string
  content: string
}
```

The server keeps the loaded projects in memory for the lifetime of the server instance to avoid repeatedly fetching the same data.

## Project structure

```text
antlis-mcp/
├── api/
│   └── mcp.ts              # Vercel MCP endpoint
│
├── src/
│   ├── data/
│   │   ├── about.ts        # Portfolio owner data
│   │   └── projects.ts     # GitHub-backed project loader/search
│   │
│   └── tools/
│       ├── about.ts        # about_me
│       └── projects.ts     # search_projects / get_project
│
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## Tech stack

* TypeScript
* Bun
* Model Context Protocol
* `mcp-handler`
* Zod
* Vercel
* GitHub API
* MDX
* `gray-matter`

## Local development

Install dependencies:

```bash
bun install
```

Start the local development server:

```bash
bun run dev
```

The MCP endpoint will be available at:

```text
http://localhost:3000/api/mcp
```

Run TypeScript checks:

```bash
bun run typecheck
```

## Testing the MCP endpoint

The endpoint uses the MCP Streamable HTTP transport.

For example, you can inspect the available tools with:

```bash
curl -s \
  -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

The production endpoint can be tested in the same way:

```bash
curl -s \
  -X POST https://antlis-mcp.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Deployment

The server is deployed to Vercel.

The MCP endpoint is exposed through:

```text
/api/mcp
```

Vercel configuration:

```json
{
  "functions": {
    "api/mcp.ts": {
      "maxDuration": 60
    }
  }
}
```

Deploy with the Vercel CLI:

```bash
bun x vercel --prod
```

## Why build an MCP server for a portfolio?

A traditional portfolio is designed for humans.

It usually answers questions by presenting:

* projects
* technologies
* job history
* blog posts
* links
* screenshots

But AI assistants need a different interface.

For example, if someone asks:

> Which of Anton's projects demonstrate TypeScript and backend experience?

A website forces the AI to discover and interpret the information itself.

With MCP, the portfolio can provide a structured interface specifically designed for this kind of interaction.

The goal is not simply to expose a website through an API.

The goal is to make the portfolio **usable as context by AI agents**.

## Roadmap

### Portfolio

* [x] MCP HTTP endpoint
* [x] Vercel deployment
* [x] `about_me`
* [x] `search_projects`
* [x] `get_project`
* [ ] `search_blog`
* [ ] `get_article`
* [ ] portfolio resources
* [ ] portfolio prompts

### AI-oriented features

* [ ] `recommend_for_role`
* [ ] project-to-skill matching
* [ ] interview preparation recommendations
* [ ] technology experience summaries
* [ ] related project discovery

For example:

```text
Recommend the most relevant projects for a Senior React
Frontend Developer position and explain why each one is relevant.
```

The server could combine project metadata, technologies, descriptions, and engineering experience to produce a much more useful result than a simple keyword search.

## Design principles

### Portfolio is the source of truth

Project information lives in the portfolio repository rather than being copied into the MCP server.

### Read-only by default

The MCP server exposes portfolio information but does not modify the portfolio.

### Small, focused tools

The MCP interface should expose useful operations rather than simply mirroring the underlying data model.

### AI-friendly data

Responses should contain enough context for an AI assistant to understand why a project is relevant, not just its name and technology list.

### No unnecessary infrastructure

The current implementation intentionally uses a simple architecture:

```text
GitHub → MCP server → AI client
```

There is no database or separate CMS required.

## Related projects

The MCP server exposes projects from my personal portfolio, including projects involving:

* Vue / Nuxt
* React / Next.js
* TypeScript
* Node.js
* Telegram bots
* AI tooling
* Linux / homelab
* automation
* developer tooling

Portfolio:

```text
https://antlis.is-a.dev
```

Portfolio source:

```text
https://github.com/antlis/antlis.github.io
```

## License

This project is personal open-source infrastructure for my portfolio.

The MCP implementation itself can be used as a reference for building a similar AI-queryable portfolio.
