import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolUnavailableError, type Library } from './library.js';
import { DEFAULT_DESCRIPTION, serverInstructions } from './practice.js';
import { failure } from './present.js';
import { tools, type ToolName } from './tools.js';

export interface ServerOptions {
	/** Shown to the model above the reading practice. */
	description?: string;
	name?: string;
	version?: string;
}

/**
 * An MCP server over one library. Every tool is read-only, so a client may
 * call them without asking; nothing here writes.
 */
export function createAlexandriaMcp(
	library: Library,
	options: ServerOptions = {}
): McpServer {
	const server = new McpServer(
		{
			name: options.name ?? 'alexandria',
			version: options.version ?? '1.0.0',
		},
		{
			instructions: serverInstructions(
				options.description ?? DEFAULT_DESCRIPTION
			),
		}
	);

	for (const name of Object.keys(tools) as ToolName[]) {
		const tool = tools[name];
		server.registerTool(
			name,
			{
				description: tool.description,
				inputSchema: tool.input.shape,
				annotations: { readOnlyHint: true },
			},
			async (input) => {
				try {
					return await tool.call(library, input);
				} catch (error) {
					if (error instanceof ToolUnavailableError) {
						return failure(error.message);
					}
					throw error;
				}
			}
		);
	}

	return server;
}
