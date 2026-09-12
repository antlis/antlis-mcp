import matter from 'gray-matter'

const GITHUB_TREE_URL =
  'https://api.github.com/repos/antlis/antlis.github.io/git/trees/master?recursive=1'

const RAW_BASE_URL =
  'https://raw.githubusercontent.com/antlis/antlis.github.io/master'

export interface Article {
  slug: string
  title: string
  description?: string
  date?: string
  tags: string[]
  category?: string
  imgSrc?: string
  href?: string
  url: string
  content: string
}

const cache = new Map<string, Article>()
let loaded = false

async function loadArticles(): Promise<Article[]> {
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
    throw new Error(`Failed to fetch blog tree: ${response.status}`)
  }

  const tree = (await response.json()) as {
    tree: Array<{
      path: string
      type: string
    }>
  }

  const articleFiles = tree.tree.filter(
    (file) =>
      file.type === 'blob' &&
      /^src\/content\/blog\/[^/]+\.mdx$/.test(file.path) &&
      !file.path.endsWith('-ru.mdx'),
  )

  for (const file of articleFiles) {
    const rawUrl = `${RAW_BASE_URL}/${file.path}`

    const articleResponse = await fetch(rawUrl)

    if (!articleResponse.ok) {
      throw new Error(
        `Failed to fetch ${file.path}: ${articleResponse.status}`,
      )
    }

    const mdx = await articleResponse.text()
    const { data, content } = matter(mdx)

    // Drafts are excluded from the production site, so skip them here too —
    // otherwise the bot would surface links that 404.
    if (data.draft === true) {
      continue
    }

    const slug = file.path
      .split('/')
      .pop()!
      .replace(/\.mdx$/, '')

    const article: Article = {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      tags: data.tags ?? [],
      category: data.category,
      imgSrc: data.imgSrc,
      href: data.href,
      url: data.href ?? `https://antlis.is-a.dev/blog/${slug}`,
      content: content.trim(),
    }

    cache.set(article.slug, article)
  }

  loaded = true

  return [...cache.values()]
}

export async function searchArticles(query: string): Promise<Article[]> {
  const articles = await loadArticles()

  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return articles
  }

  const terms = normalizedQuery.split(/\s+/)

  return articles
    .map((article) => {
      const searchable = [
        article.title,
        article.description ?? '',
        ...article.tags,
        article.category ?? '',
        article.content,
      ]
        .join(' ')
        .toLowerCase()

      const matches = terms.filter((term) => searchable.includes(term))

      return {
        article,
        score: matches.length,
      }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article)
}

export async function getArticle(
  slug: string,
): Promise<Article | undefined> {
  const articles = await loadArticles()

  return articles.find((article) => article.slug === slug)
}
