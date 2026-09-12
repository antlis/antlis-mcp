import matter from 'gray-matter'

const GITHUB_TREE_URL =
  'https://api.github.com/repos/antlis/antlis.github.io/git/trees/master?recursive=1'

const RAW_BASE_URL =
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master'

export interface Tool {
  slug: string
  name: string
  description: string
  url: string
  category: string
  usage: string
  openSource: boolean
  cli: boolean
  ai: boolean
}

const cache = new Map<string, Tool>()
let loaded = false

async function loadTools(): Promise<Tool[]> {
  if (loaded) {
    return [...cache.values()]
  }

  const response = await fetch(GITHUB_TREE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'antlis-mcp',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch tools tree: ${response.status}`)
  }

  const tree = (await response.json()) as {
    tree: Array<{
      path: string
      type: string
    }>
  }

  const toolFiles = tree.tree.filter(
    (file) =>
      file.type === 'blob' &&
      /^src\/content\/tools\/[^/]+\.mdx$/.test(file.path) &&
      !file.path.endsWith('-ru.mdx'),
  )

  for (const file of toolFiles) {
    const rawUrl = `${RAW_BASE_URL}/${file.path}`

    const mdxResponse = await fetch(rawUrl)

    if (!mdxResponse.ok) {
      throw new Error(
        `Failed to fetch ${file.path}: ${mdxResponse.status}`,
      )
    }

    const mdx = await mdxResponse.text()
    const { data } = matter(mdx)

    const tool: Tool = {
      slug: file.path
        .split('/')
        .pop()!
        .replace(/\.mdx$/, ''),
      name: data.name,
      description: data.description,
      url: data.url,
      category: data.category,
      usage: data.usage,
      openSource: data.openSource ?? false,
      cli: data.cli ?? false,
      ai: data.ai ?? false,
    }

    cache.set(tool.slug, tool)
  }

  loaded = true

  return [...cache.values()]
}

export async function searchTools(query: string): Promise<Tool[]> {
  const tools = await loadTools()

  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return tools
  }

  const terms = normalizedQuery.split(/\s+/)

  return tools
    .map((tool) => {
      const searchable = [
        tool.name,
        tool.description,
        tool.category,
        tool.usage,
      ]
        .join(' ')
        .toLowerCase()

      const matches = terms.filter((term) => searchable.includes(term))

      return {
        tool,
        score: matches.length,
      }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ tool }) => tool)
}
