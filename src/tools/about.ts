import { about } from '../data/about.ts'

export function registerAboutTool(server: any) {
  server.registerTool(
    'about_me',
    {
      title: 'About Anton',
      description: 'Get information about the owner of this portfolio',
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: [
            `${about.name} is a ${about.title}.`,
            `He has ${about.experience}.`,
            `Primary stack: ${about.stack.join(', ')}.`,
            `Interests: ${about.interests.join(', ')}.`,
            `Website: ${about.website}`,
          ].join('\n'),
        },
      ],
    }),
  )
}
