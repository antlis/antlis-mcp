// Profile + contact data lives in the website repo as the single source of
// truth (src/data/profile.json) and is fetched live here — same approach as
// architecture.ts / overview.ts — so it never has to be maintained in two
// places. Edit the JSON on the site; the site, the chat widget, and this MCP
// server all pick it up.
const RAW_URL =
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master/src/data/profile.json'

export interface Profile {
  name: string
  title: string
  focus: string
  website: string
  availability: string
  bio: string
  specialties: string[]
  domains: string[]
  alsoDoes: string[]
  interests: string[]
  stack: { primary: string[]; tooling: string[] }
  contact: {
    preferred: string
    telegram: string
    contactPage: string
    platforms: Array<{ name: string; url: string; icon?: string }>
  }
}

let cached: Profile | null = null

export async function getProfile(): Promise<Profile> {
  if (cached) return cached

  const response = await fetch(RAW_URL, {
    headers: { 'User-Agent': 'antlis-mcp' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.status}`)
  }

  cached = (await response.json()) as Profile
  return cached
}

export function formatAbout(p: Profile): string {
  return [
    `${p.name} is a ${p.title}.`,
    p.bio,
    `Specialties: ${p.specialties.join('; ')}.`,
    `Domains he's shipped in: ${p.domains.join(', ')}.`,
    `Also does: ${p.alsoDoes.join('; ')}.`,
    `Primary stack: ${p.stack.primary.join(', ')}.`,
    `Interests: ${p.interests.join(', ')}.`,
    p.availability,
    `Website: ${p.website}`,
  ].join('\n')
}

export function formatContact(p: Profile): string {
  const c = p.contact
  return [
    `Preferred: ${c.preferred} — ${c.telegram}`,
    `Contact form: ${c.contactPage}`,
    'Profiles:',
    ...c.platforms.map((pl) => `- ${pl.name}: ${pl.url}`),
  ].join('\n')
}
