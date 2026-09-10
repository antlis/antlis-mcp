import { z } from 'zod'
import { searchProjects } from '../data/projects.ts'

export function registerProjectsTool(server: any) {
  server.registerTool(
    'search_projects',
    {
      title: 'Search Projects',
      description:
        "Search Anton's portfolio projects by technology, topic, description, or engineering experience.",
      inputSchema: {
        query: z
          .string()
          .describe(
            'Search query, such as "React", "Telegram", "Node.js", "AI", or "frontend"',
          ),
      },
    },
    async ({ query }: { query: string }) => {
      const projects = await searchProjects(query)

      const results = projects.map((project) => ({
        slug: project.slug,
        title: project.title,
        description: project.description,
        stack: project.stack,
        year: project.year,
        scope: project.scope,
        highlights: project.highlights,
        outcome: project.outcome,
        href: project.href,
        blogHref: project.blogHref,
      }))

      return {
        content: [
          {
            type: 'text',
            text: results.length
              ? JSON.stringify(results, null, 2)
              : `No projects found for "${query}".`,
          },
        ],
      }
    },
  )

  server.registerTool(
    'get_project',
    {
      title: 'Get Project',
      description:
        "Get detailed information about one of Anton's portfolio projects.",
      inputSchema: {
        slug: z
          .string()
          .describe('Project slug, for example "tg-mpv-bot".'),
      },
    },
    async ({ slug }: { slug: string }) => {
      const projects = await searchProjects('')

      const project = projects.find((item) => item.slug === slug)

      if (!project) {
        return {
          content: [
            {
              type: 'text',
              text: `Project "${slug}" not found.`,
            },
          ],
          isError: true,
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(project, null, 2),
          },
        ],
      }
    },
  )
}
