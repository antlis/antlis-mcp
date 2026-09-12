import { z } from 'zod'
import { searchTools } from '../data/tools.ts'

export function registerToolsTool(server: any) {
  server.registerTool(
    'search_tools',
    {
      title: 'Search Tools',
      description:
        'Search the tools and software Anton uses — CLI utilities, terminal apps, editors, dev/system tooling.',
      inputSchema: {
        query: z
          .string()
          .describe(
            'Search query, such as "terminal", "AI", "browser", or "database"',
          ),
      },
    },
    async ({ query }: { query: string }) => {
      const tools = await searchTools(query)

      const results = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        usage: tool.usage,
        url: tool.url,
      }))

      return {
        content: [
          {
            type: 'text',
            text: results.length
              ? JSON.stringify(results, null, 2)
              : `No tools found for "${query}".`,
          },
        ],
      }
    },
  )
}
