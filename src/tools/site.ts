import { getArchitecture } from '../data/architecture.ts'
import { getSiteOverview } from '../data/overview.ts'

export function registerSiteTools(server: any) {
  server.registerTool(
    'site_overview',
    {
      title: 'Site Overview',
      description:
        'Explain what this site is — its purpose, audience, content sections, and the product/brand decisions behind it. For the technical stack, use how_the_site_is_built instead.',
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: await getSiteOverview(),
        },
      ],
    }),
  )

  server.registerTool(
    'how_the_site_is_built',
    {
      title: 'How the Site Is Built',
      description:
        "Explain how the portfolio website itself is built — framework, stack, structure, and conventions. Use for questions about the site's own technology.",
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: await getArchitecture(),
        },
      ],
    }),
  )
}
