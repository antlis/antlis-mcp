import { getProfile, formatAbout } from '../data/profile.ts'

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
          text: formatAbout(await getProfile()),
        },
      ],
    }),
  )
}
