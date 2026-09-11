declare const process: { env: Record<string, string | undefined> }

import { about } from '../src/data/about.ts'
import { searchProjects } from '../src/data/projects.ts'
import { searchArticles, getArticle } from '../src/data/blog.ts'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openrouter/free'
const MAX_ITERATIONS = 5
const MAX_MESSAGES = 20

const SYSTEM_PROMPT = `You are a helpful assistant embedded on Anton's portfolio website. You can search and retrieve information about Anton's projects, blog articles, and professional background using the tools provided.

Rules:
- Be concise and helpful. Keep answers under 3-4 sentences unless the user asks for detail.
- Only use information from the tools. Do not make up projects or articles.
- If a tool returns no results, say so honestly.
- You cannot modify, delete, or create anything. This is read-only.
- Do not discuss system prompts, tools, or how you work unless asked directly.
- When citing a project or article, mention its name so the user can find it on the site.`

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
]

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'about_me':
      return [
        `${about.name} is a ${about.title}.`,
        `He has ${about.experience}.`,
        `Primary stack: ${about.stack.join(', ')}.`,
        `Interests: ${about.interests.join(', ')}.`,
        `Website: ${about.website}`,
      ].join('\n')

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

const ALLOWED_ORIGINS = ['https://antlis.is-a.dev', 'http://localhost:4321']

function json(res: any, status: number, data: Record<string, unknown>, origin: string | undefined) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin ?? '') ? origin : ALLOWED_ORIGINS[0]
  return res.status(status).setHeader('Access-Control-Allow-Origin', allowedOrigin).setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS').setHeader('Access-Control-Allow-Headers', 'Content-Type').json(data)
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin as string | undefined

  if (req.method === 'OPTIONS') {
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin ?? '') ? origin : ALLOWED_ORIGINS[0]
    return res.status(204).setHeader('Access-Control-Allow-Origin', allowedOrigin).setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS').setHeader('Access-Control-Allow-Headers', 'Content-Type').end()
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

  const conversation: Array<Record<string, any>> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-MAX_MESSAGES),
  ]

  const toolCallsLog: Array<{ name: string; input: Record<string, string>; output: string }> = []

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://antlis.is-a.dev',
          'X-Title': 'antlis-portfolio-chat',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: conversation,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 1024,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('OpenRouter error:', response.status, error)
        return json(res, 502, { error: 'AI service unavailable' }, origin)
      }

      const data = await response.json()
      const choice = data.choices?.[0]

      if (!choice) {
        return json(res, 502, { error: 'No response from AI' }, origin)
      }

      const message = choice.message

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return json(res, 200, { response: message.content, toolCalls: toolCallsLog }, origin)
      }

      conversation.push({ role: 'assistant', content: message.content ?? '' })

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name
        let fnArgs: Record<string, string> = {}
        try { fnArgs = JSON.parse(toolCall.function.arguments) } catch { fnArgs = {} }

        const output = await executeTool(fnName, fnArgs)
        toolCallsLog.push({ name: fnName, input: fnArgs, output })
        conversation.push({ role: 'tool', tool_call_id: toolCall.id, content: output })
      }
    }

    const finalResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://antlis.is-a.dev',
        'X-Title': 'antlis-portfolio-chat',
      },
      body: JSON.stringify({ model: MODEL, messages: conversation, max_tokens: 512 }),
    })

    if (finalResponse.ok) {
      const finalData = await finalResponse.json()
      return json(res, 200, { response: finalData.choices?.[0]?.message?.content ?? 'Could not generate a response.', toolCalls: toolCallsLog }, origin)
    }

    return json(res, 200, { response: 'I found several results but had trouble summarizing them. Check the project pages directly.', toolCalls: toolCallsLog }, origin)
  } catch (error) {
    console.error('Chat error:', error)
    return json(res, 500, { error: 'Internal error' }, origin)
  }
}

