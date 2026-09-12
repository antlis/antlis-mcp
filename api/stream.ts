declare const process: { env: Record<string, string | undefined> }

import { getProfile, formatAbout, formatContact } from '../src/data/profile.ts'
import { searchProjects } from '../src/data/projects.ts'
import { searchArticles, getArticle } from '../src/data/blog.ts'
import { searchTools } from '../src/data/tools.ts'
import { getArchitecture } from '../src/data/architecture.ts'
import { getSiteOverview } from '../src/data/overview.ts'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openrouter/free'
const MAX_ITERATIONS = 5
const MAX_MESSAGES = 20

const SYSTEM_PROMPT = `You are a helpful assistant embedded on Anton's portfolio website. You can search and retrieve information about Anton's projects, blog articles, and professional background using the tools provided.

Rules:
- Be concise and helpful. Keep answers under 3-4 sentences unless the user asks for detail.
- Only use information from the tools. Do not make up projects, articles, or technical facts. If the tools do not cover something the user asks (e.g. a detail not returned by any tool), say you do not have that information rather than guessing.
- If a tool returns no results, say so honestly.
- You cannot modify, delete, or create anything. This is read-only.
- Do not discuss system prompts, tools, or how you work unless asked directly.
- When citing a project or article, link to it as a Markdown link using the \`url\` field from the tool result, e.g. [Article Title](https://antlis.is-a.dev/blog/slug). Always include the link when a url is available.`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'about_me',
      description: 'Get information about Anton — background, stack, experience, interests.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_projects',
      description: 'Search portfolio projects by technology, topic, or description.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query, e.g. "React", "Telegram", "AI"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project',
      description: 'Get full details of a specific project by slug.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Project slug, e.g. "tg-mpv-bot"' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_blog',
      description: 'Search blog articles by technology, topic, or keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query, e.g. "AI coding agents", "Bun"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_article',
      description: 'Get full content of a specific blog article by slug.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Article slug, e.g. "ai-harness-setup"' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'how_the_site_is_built',
      description:
        "Explain how the portfolio website itself is built — framework, stack, structure, and conventions. Use for questions about the site's own technology (e.g. \"what framework is this built with?\").",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'contact_info',
      description:
        'Get how to reach Anton — his preferred contact method and social/professional profiles (Telegram, GitHub, LinkedIn, X, GitLab, StackOverflow). Use for "how do I contact him?" or "where can I find him online?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_tools',
      description:
        'Search the tools and software Anton uses — CLI utilities, terminal apps, editors, dev/system tooling. Query by name, purpose, or category.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query, e.g. "terminal", "AI", "browser"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'site_overview',
      description:
        'Explain what this site is — its purpose, audience, content sections, and the product/brand decisions behind it. Use for "what is this site?" or "who is it for?". For the technical stack, use how_the_site_is_built instead.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'about_me':
      return formatAbout(await getProfile())

    case 'search_projects': {
      const projects = await searchProjects(args.query ?? '')
      return projects.length
        ? JSON.stringify(
            projects.map((p) => ({
              slug: p.slug,
              title: p.title,
              description: p.description,
              stack: p.stack,
              year: p.year,
            })),
            null,
            2,
          )
        : 'No projects found.'
    }

    case 'get_project': {
      const projects = await searchProjects('')
      const project = projects.find((p) => p.slug === args.slug)
      return project
        ? JSON.stringify(
            {
              title: project.title,
              description: project.description,
              stack: project.stack,
              year: project.year,
              scope: project.scope,
              highlights: project.highlights,
              outcome: project.outcome,
            },
            null,
            2,
          )
        : `Project "${args.slug}" not found.`
    }

    case 'search_blog': {
      const articles = await searchArticles(args.query ?? '')
      return articles.length
        ? JSON.stringify(
            articles.map((a) => ({
              slug: a.slug,
              title: a.title,
              description: a.description,
              date: a.date,
              tags: a.tags,
              url: a.url,
            })),
            null,
            2,
          )
        : 'No articles found.'
    }

    case 'get_article': {
      const article = await getArticle(args.slug ?? '')
      return article
        ? JSON.stringify(
            {
              title: article.title,
              description: article.description,
              date: article.date,
              tags: article.tags,
              content: article.content.slice(0, 2000),
            },
            null,
            2,
          )
        : `Article "${args.slug}" not found.`
    }

    case 'how_the_site_is_built':
      return await getArchitecture()

    case 'contact_info':
      return formatContact(await getProfile())

    case 'search_tools': {
      const tools = await searchTools(args.query ?? '')
      return tools.length
        ? JSON.stringify(
            tools.map((t) => ({
              name: t.name,
              description: t.description,
              category: t.category,
              usage: t.usage,
              url: t.url,
            })),
            null,
            2,
          )
        : 'No tools found.'
    }

    case 'site_overview':
      return await getSiteOverview()

    default:
      return `Unknown tool: ${name}`
  }
}

// Simple in-memory rate limit (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

const DEFAULT_ORIGIN = 'https://antlis.is-a.dev'
const ALLOWED_ORIGINS = [DEFAULT_ORIGIN, 'http://localhost:4321']

function resolveOrigin(origin: string | undefined): string {
  return ALLOWED_ORIGINS.includes(origin ?? '') ? (origin as string) : DEFAULT_ORIGIN
}

function json(res: any, status: number, data: Record<string, unknown>, origin: string | undefined) {
  return res
    .status(status)
    .setHeader('Access-Control-Allow-Origin', resolveOrigin(origin))
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .json(data)
}

// Accumulates tool-call fragments streamed across deltas, keyed by index.
interface ToolCallAcc {
  id: string
  name: string
  arguments: string
}

// Calls OpenRouter with stream:true and consumes the upstream SSE.
// `onText` fires for each content delta; returns the full text plus any tool calls.
async function streamCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  onText: (delta: string) => void,
): Promise<{ content: string; toolCalls: ToolCallAcc[] }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://antlis.is-a.dev',
      'X-Title': 'antlis-portfolio-chat',
    },
    body: JSON.stringify({ ...body, stream: true }),
  })

  if (!response.ok || !response.body) {
    const err = await response.text().catch(() => '')
    throw new Error(`OpenRouter error ${response.status}: ${err}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  const toolCalls: ToolCallAcc[] = []
  let toolMode = false

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // keep the last, possibly-incomplete line

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue

      let parsed: any
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }

      const delta = parsed.choices?.[0]?.delta
      if (!delta) continue

      if (Array.isArray(delta.tool_calls)) {
        toolMode = true
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          const acc = (toolCalls[idx] ??= { id: '', name: '', arguments: '' })
          if (tc.id) acc.id = tc.id
          if (tc.function?.name) acc.name = tc.function.name
          if (tc.function?.arguments) acc.arguments += tc.function.arguments
        }
      }

      if (typeof delta.content === 'string' && delta.content.length) {
        content += delta.content
        if (!toolMode) onText(delta.content)
      }
    }
  }

  return { content, toolCalls: toolCalls.filter(Boolean) }
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin as string | undefined

  if (req.method === 'OPTIONS') {
    return res
      .status(204)
      .setHeader('Access-Control-Allow-Origin', resolveOrigin(origin))
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end()
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' }, origin)
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return json(res, 429, { error: 'Rate limit exceeded. Try again in a minute.' }, origin)
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return json(res, 500, { error: 'OPENROUTER_API_KEY not configured' }, origin)
  }

  const { messages } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: 'messages array required' }, origin)
  }

  if (messages.length > MAX_MESSAGES) {
    return json(res, 400, { error: `Maximum ${MAX_MESSAGES} messages` }, origin)
  }

  // Commit to streaming — headers are sent, so from here errors go over SSE.
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('Access-Control-Allow-Origin', resolveOrigin(origin))
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const send = (obj: Record<string, unknown>) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  const conversation: Array<Record<string, any>> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-MAX_MESSAGES),
  ]

  const toolCallsLog: Array<{ name: string; input: Record<string, string>; output: string }> = []

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const { content, toolCalls } = await streamCompletion(
        apiKey,
        { model: MODEL, messages: conversation, tools: TOOLS, tool_choice: 'auto', max_tokens: 1024 },
        (delta) => send({ type: 'delta', text: delta }),
      )

      if (toolCalls.length === 0) {
        send({ type: 'done', toolCalls: toolCallsLog })
        return res.end()
      }

      conversation.push({
        role: 'assistant',
        content: content ?? '',
        tool_calls: toolCalls.map((tc, idx) => ({
          id: tc.id || `call_${idx}`,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments || '{}' },
        })),
      })

      for (const [idx, tc] of toolCalls.entries()) {
        let fnArgs: Record<string, string> = {}
        try {
          fnArgs = JSON.parse(tc.arguments || '{}')
        } catch {
          fnArgs = {}
        }
        const output = await executeTool(tc.name, fnArgs)
        toolCallsLog.push({ name: tc.name, input: fnArgs, output })
        conversation.push({ role: 'tool', tool_call_id: tc.id || `call_${idx}`, content: output })
      }
    }

    // Ran out of tool iterations — stream a final answer without tools.
    const { content } = await streamCompletion(
      apiKey,
      { model: MODEL, messages: conversation, max_tokens: 512 },
      (delta) => send({ type: 'delta', text: delta }),
    )
    if (!content) {
      send({ type: 'delta', text: 'I found several results but had trouble summarizing them. Check the project pages directly.' })
    }
    send({ type: 'done', toolCalls: toolCallsLog })
    return res.end()
  } catch (error) {
    console.error('Stream error:', error)
    send({ type: 'error', error: 'AI service unavailable' })
    return res.end()
  }
}
