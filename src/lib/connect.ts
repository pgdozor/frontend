import { createClient, type Client } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { env } from '$env/dynamic/public';
import { ActivityService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/activity_pb';
import { StatementService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
import { HealthService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/health_pb';
import { LogService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/log_pb';
import { AuthService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/auth_pb';
import { AdminService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/admin_pb';
import { AlertService } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/alert_pb';

/**
 * Base URL of the pgdozor backend Connect API. Override with the
 * PUBLIC_API_URL environment variable (see .env.example).
 */
const baseUrl = env.PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Connect transport shared by all backend clients. The fetch override sends the
 * HTTP-only session cookie on every request (cross-origin in dev), so the
 * backend can authenticate the logged-in user.
 */
const transport = createConnectTransport({
	baseUrl,
	fetch: (input, init) => globalThis.fetch(input, { ...init, credentials: 'include' })
});

/** Typed client for the backend ActivityService (pg_stat_activity snapshots). */
export const activityClient: Client<typeof ActivityService> = createClient(ActivityService, transport);

/** Typed client for the backend StatementService (pg_stat_statements snapshots). */
export const statementClient: Client<typeof StatementService> = createClient(StatementService, transport);

/** Typed client for the backend HealthService (monitored servers / collector health). */
export const healthClient: Client<typeof HealthService> = createClient(HealthService, transport);

/** Typed client for the backend LogService (Postgres log events). */
export const logClient: Client<typeof LogService> = createClient(LogService, transport);

/** Typed client for the backend AuthService (login / logout / current user). */
export const authClient: Client<typeof AuthService> = createClient(AuthService, transport);

/** Typed client for the backend AdminService (collector tokens / users). */
export const adminClient: Client<typeof AdminService> = createClient(AdminService, transport);

/** Typed client for the backend AlertService (per-server Slack alert settings). */
export const alertClient: Client<typeof AlertService> = createClient(AlertService, transport);
