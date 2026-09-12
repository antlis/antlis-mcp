// The site documents what it is (purpose, audience, content surfaces) and its
// product/brand decisions in tracked repo docs. We read them live — same
// source-of-truth approach as the architecture doc — so the chat never has to
// hardcode or hallucinate what the site is about.
const DOC_URLS = [
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master/.claude/CONTEXT.md',
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master/PRODUCT.md',
]

let cached: string | null = null

export async function getSiteOverview(): Promise<string> {
  if (cached) return cached

  const parts = await Promise.all(
    DOC_URLS.map(async (url) => {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'antlis-mcp' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch overview doc: ${response.status}`)
      }

      return (await response.text()).trim()
    }),
  )

  cached = parts.join('\n\n---\n\n')
  return cached
}
