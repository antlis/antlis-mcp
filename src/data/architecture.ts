// The website documents its own stack/architecture/conventions in a tracked
// repo doc. We read it live (same source-of-truth approach as blog/projects)
// so the chat never has to hardcode — or hallucinate — how the site is built.
const RAW_URL =
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master/.claude/ARCHITECTURE.md'

let cached: string | null = null

export async function getArchitecture(): Promise<string> {
  if (cached) return cached

  const response = await fetch(RAW_URL, {
    headers: { 'User-Agent': 'antlis-mcp' },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch architecture doc: ${response.status}`)
  }

  cached = (await response.text()).trim()
  return cached
}
