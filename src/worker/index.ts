import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { d1Library } from '../d1/index.js';
import { createAlexandriaMcp } from '../server.js';
import { serviceTokenAuth } from './access.js';
import type { WorkerEnv } from './env.js';

/**
 * The server over Streamable HTTP, stateless: each request gets a fresh
 * server, so nothing is held between calls and any isolate can answer.
 */
const app = new Hono<{ Bindings: WorkerEnv }>();

app.all('/mcp', serviceTokenAuth(), async (c) => {
	const server = createAlexandriaMcp(d1Library(c.env), {
		description: c.env.LIBRARY_DESCRIPTION,
	});
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
	});
	await server.connect(transport);
	return transport.handleRequest(c.req.raw);
});

app.get('/', (c) => c.text('alexandria-mcp. The server is at /mcp.\n'));

export default app;
export { serviceTokenAuth, type WorkerEnv };
