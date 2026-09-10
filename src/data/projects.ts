import matter from 'gray-matter'

const GITHUB_TREE_URL =
  'https://api.github.com/repos/antlis/antlis.github.io/git/trees/master?recursive=1'

const RAW_BASE_URL =
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master'

export interface Project {
  slug: string
  title: string
  description: string
  category: string
  imgSrc?: string
  imgAlt?: string
  href?: string
  blogHref?: string
  stack: string[]
  year: string
  scope: string[]
  highlights: string[]
  outcome?: string
  improvements?: string
  content: string
}

const cache = new Map<string, Project>()
let loaded = false

async function loadProjects(): Promise<Project[]> {
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
    throw new Error(`Failed to fetch project tree: ${response.status}`)
  }

  const tree = (await response.json()) as {
    tree: Array<{
      path: string
      type: string
    }>
  }

  const projectFiles = tree.tree.filter(
    (file) =>
      file.type === 'blob' &&
      /^src\/content\/projects\/[^/]+\.mdx$/.test(file.path) &&
      !file.path.endsWith('-ru.mdx'),
  )

  for (const file of projectFiles) {
    const rawUrl = `${RAW_BASE_URL}/${file.path}`

    const mdxResponse = await fetch(rawUrl)

    if (!mdxResponse.ok) {
      throw new Error(
        `Failed to fetch ${file.path}: ${mdxResponse.status}`,
      )
    }

    const mdx = await mdxResponse.text()
    const { data, content } = matter(mdx)

    const project: Project = {
      slug: file.path
        .split('/')
        .pop()!
        .replace(/\.mdx$/, ''),
      title: data.title,
      description: data.description,
      category: data.category,
      imgSrc: data.imgSrc,
      imgAlt: data.imgAlt,
      href: data.href,
      blogHref: data.blogHref,
      stack: data.stack ?? [],
      year: data.year,
      scope: data.scope ?? [],
      highlights: data.highlights ?? [],
      outcome: data.outcome,
      improvements: data.improvements,
      content: content.trim(),
    }

    cache.set(project.slug, project)
  }

  loaded = true

  return [...cache.values()]
}

export async function searchProjects(query: string): Promise<Project[]> {
  const projects = await loadProjects()

  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return projects
  }

  const terms = normalizedQuery.split(/\s+/)

  return projects
    .map((project) => {
      const searchable = [
        project.title,
        project.description,
        ...project.stack,
        ...project.scope,
        ...project.highlights,
        project.outcome ?? '',
        project.improvements ?? '',
        project.content,
      ]
        .join(' ')
        .toLowerCase()

      const matches = terms.filter((term) => searchable.includes(term))

      return {
        project,
        score: matches.length,
      }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ project }) => project)
}
