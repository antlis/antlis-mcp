import { getProfile, formatContact } from '../data/profile.ts'

export function registerContactTool(server: any) {
  server.registerTool(
    'contact_info',
    {
      title: 'Contact Info',
      description:
        "Get how to reach Anton — his preferred contact method and social/professional profiles (Telegram, GitHub, LinkedIn, X, GitLab, StackOverflow).",
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: formatContact(await getProfile()),
        },
      ],
    }),
  )
}
