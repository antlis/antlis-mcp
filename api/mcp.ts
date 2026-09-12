import { createMcpHandler } from 'mcp-handler'
import { registerAboutTool } from '../src/tools/about.ts'
import { registerBlogTools } from '../src/tools/blog.ts'
import { registerProjectsTool } from '../src/tools/projects.ts'
import { registerContactTool } from '../src/tools/contact.ts'
import { registerToolsTool } from '../src/tools/tools.ts'
import { registerSiteTools } from '../src/tools/site.ts'

const handler = createMcpHandler((server) => {
  registerAboutTool(server)
  registerProjectsTool(server)
  registerBlogTools(server)
  registerContactTool(server)
  registerToolsTool(server)
  registerSiteTools(server)
})

export { handler as GET, handler as POST }
