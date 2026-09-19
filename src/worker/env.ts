/// <reference types="@cloudflare/workers-types" />
import type { D1LibraryBindings } from '../d1/index.js';

export interface WorkerEnv extends D1LibraryBindings {
	/** Cloudflare Access team domain, e.g. https://myteam.cloudflareaccess.com */
	TEAM_DOMAIN?: string;
	/** `aud` tag of the Access application in front of /mcp */
	MCP_POLICY_AUD?: string;
	/** Client id of the one service token allowed to call it */
	MCP_SERVICE_TOKEN_ID?: string;
	/**
	 * "true" in .dev.vars stands in for Access on a local process. Nothing in
	 * a request distinguishes a local worker from a deployed one, so this is
	 * exactly as trustworthy as the variable: never set it as a secret.
	 */
	LOCAL_DEV?: string;
	/** Shown to the model above the reading practice. */
	LIBRARY_DESCRIPTION?: string;
}
