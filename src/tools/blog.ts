import { z } from 'zod'
import { getArticle, searchArticles } from '../data/blog.ts'

export function registerBlogTools(server: any) {
  server.registerTool(
    'search_blog',
    {
      title: 'Search Blog',
      description:
        "Search Anton's blog articles by technology, topic, title, tags, or content.",
      inputSchema: {
        query: z
          .string()
          .describe(
            'Search query, such as "AI coding agents", "Bun", "Telegram", "Linux", or "Vue"',
          ),
      },
    },
    async ({ query }: { query: string }) => {
      const articles = await searchArticles(query)

      const results = articles.map((article) => ({
        slug: article.slug,
        title: article.title,
        description: article.description,
        date: article.date,
        tags: article.tags,
        category: article.category,
        href: article.href,
      }))

      return {
        content: [
          {
            type: 'text',
            text: results.length
              ? JSON.stringify(results, null, 2)
              : `No articles found for "${query}".`,
          },
        ],
      }
    },
  )

  server.registerTool(
    'get_article',
    {
      title: 'Get Article',
      description:
        "Get the complete content and metadata of one of Anton's blog articles.",
      inputSchema: {
        slug: z
          .string()
          .describe('Article slug, for example "ai-harness-setup".'),
      },
    },
    async ({ slug }: { slug: string }) => {
      const article = await getArticle(slug)

      if (!article) {
        return {
          content: [
            {
              type: 'text',
              text: `Article "${slug}" not found.`,
            },
          ],
          isError: true,
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(article, null, 2),
          },
        ],
      }
    },
  )
}
