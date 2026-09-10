import { createMcpHandler } from 'mcp-handler'
import { registerAboutTool } from '../src/tools/about.ts'
import { registerProjectsTool } from '../src/tools/projects.ts'

const handler = createMcpHandler((server) => {
  registerAboutTool(server)
  registerProjectsTool(server)
})

export { handler as GET, handler as POST }
