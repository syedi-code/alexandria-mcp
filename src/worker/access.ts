import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from './env.js';

// Survives across requests within the same isolate, and is rebuilt if the
// team domain changes under it.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksTeamDomain: string | null = null;

function keySet(teamDomain: string) {
	if (!jwks || jwksTeamDomain !== teamDomain) {
		jwks = createRemoteJWKSet(
			new URL(`${teamDomain}/cdn-cgi/access/certs`)
		);
		jwksTeamDomain = teamDomain;
	}
	return jwks;
}

/**
 * Cloudflare Access rejects a request without the service token before it
 * reaches this worker. Verifying the assertion here proves the request really
 * came through that Access application, with that token, rather than trusting
 * the edge to be configured the way we think it is.
 */
export function serviceTokenAuth(): MiddlewareHandler<{ Bindings: WorkerEnv }> {
	return async (c, next) => {
		if (c.env.LOCAL_DEV === 'true') return next();

		const { TEAM_DOMAIN, MCP_POLICY_AUD, MCP_SERVICE_TOKEN_ID } = c.env;
		if (!TEAM_DOMAIN || !MCP_POLICY_AUD || !MCP_SERVICE_TOKEN_ID) {
			return c.json({ error: 'MCP is not configured' }, 503);
		}

		const token = c.req.header('cf-access-jwt-assertion');
		if (!token) return c.json({ error: 'Access token required' }, 401);

		try {
			const { payload } = await jwtVerify(token, keySet(TEAM_DOMAIN), {
				issuer: TEAM_DOMAIN,
				audience: MCP_POLICY_AUD,
				clockTolerance: 300,
			});
			if (payload.common_name !== MCP_SERVICE_TOKEN_ID) {
				return c.json({ error: 'This token may not use MCP' }, 403);
			}
		} catch {
			return c.json({ error: 'Invalid Access token' }, 401);
		}

		return next();
	};
}
