# Dev’ai Controller v2 — Operations Runbook

This runbook describes day-to-day operational responsibilities after deployment, including health verification, incident response, and rollback procedures.

## 1. Production responsibilities

The operator is expected to verify:

- Cloudflare secrets are present and valid
- Worker deployment succeeded
- health endpoints return success
- admin login works
- Email Sending or configured external provider is healthy
- system status shows only truthful available states

## 2. Health checks

Run these checks after deployment and on a recurring basis:

### 2.1 System health

```bash
curl https://devai-controller.<account-id>.workers.dev/api/health
```

Expected: HTTP 200.

### 2.2 Auth readiness

```bash
curl https://devai-controller.<account-id>.workers.dev/api/auth/readiness
```

Expected: readiness reports all required admin fields as configured.

### 2.3 Privacy protection

```bash
curl -i https://devai-controller.<account-id>.workers.dev/api/deployments
```

Expected: anonymous access is rejected with 401.

## 3. Smoke tests

Run or verify the following after every deployment:

1. Browser loads the app successfully.
2. Login succeeds with the configured admin credentials.
3. Authenticated session is established.
4. Protected routes return JSON or data as expected.
5. Unknown routes return JSON 404 instead of SPA fallback.
6. The UI does not show fake success states for unavailable integrations.
7. Email or provider features reflect true runtime status.

## 4. Monitoring approach

Recommended monitoring checks:

- `/api/health` every 5 minutes
- `/api/auth/readiness` every 10 minutes
- protected API endpoints as needed
- Worker logs and deployment history in Cloudflare Dashboard

If any endpoint fails, review logs before redeploying.

## 5. Incident response

### 5.1 Worker deploy fails

Actions:

1. Open GitHub Actions logs.
2. Check the failing job details.
3. Re-run local validation to reproduce the issue.
4. Fix the environment or code issue.
5. Redeploy only after verifying the root cause is resolved.

### 5.2 Health endpoint fails

Actions:

1. confirm the Worker is still online
2. inspect logs for runtime exception
3. verify secrets are defined
4. check domain and binding configuration
5. test auth routes directly

### 5.3 Authentication is broken

Actions:

1. confirm `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_JWT_KEY` are configured
2. inspect session behavior in browser
3. validate cookie creation and auth verification
4. review server logs for auth failures

### 5.4 Email not sending

Actions:

1. confirm `EMAIL` binding exists
2. verify sender address is allowed
3. review domain onboarding and routing setup
4. inspect Worker logs for transporter or send-email errors

## 6. Rollback procedure

Use rollback when the current deployment is unstable or a critical endpoint fails.

Procedure:

1. Open Cloudflare Dashboard.
2. Go to Workers → devai-controller → Deployments.
3. Select the most recent stable version.
4. Roll back to that version.
5. Re-test `/api/health` and auth readiness.
6. Record the failure as an incident and document the root cause.

## 7. Change management

Before production changes:

- validate locally first
- ensure deployment is tested in the appropriate environment
- review any provider or secret updates
- confirm no secrets are added to the repo
- confirm the app still reports truthful operational status

## 8. Required post-deploy evidence

Capture and store:

- deployment time
- Worker version / deployment ID
- verification result of `/api/health`
- verification result of `/api/auth/readiness`
- login success result
- any provider status checks and failures

## 9. Expected production outcomes

A healthy deployment should show:

- health check returns success
- admin auth works
- private routes reject anonymous requests
- no fake success messages appear
- external providers report unavailable if not configured
- system state reflects actual runtime results

## 10. Related docs

- `docs/DEPLOYMENT_ACTIONS.md`
- `docs/TROUBLESHOOTING.md`
- `docs/SES_INTEGRATION.md`
- `DEPLOYMENT.md`
- `DEPLOYMENT_CHECKLIST.md`

---

This runbook is intended to be used by the person or team operating the application after deployment.
