# Cloudflare Deployment Readiness Checklist

**Status:** Multiple CI/CD failures detected. This document provides a complete action plan to prepare UI, API, and Backend for production Cloudflare deployment.

**Last Updated:** 2026-09-30

---

## Quick Status Summary

| Component | Status | Issues |
|-----------|--------|--------|
| **UI (React/Vite)** | ⚠️ Needs Verification | Build process requires validation |
| **API (Express/Node)** | ⚠️ Needs Verification | Tests failing in CI; requires fixes |
| **Backend (Cloudflare Worker)** | ⚠️ Needs Verification | Dry-run validation failing |
| **CI/CD Pipeline** | ❌ Failing | All recent workflow runs failed |
| **Secrets Configuration** | ❌ Not Ready | GitHub Actions secrets missing |

---

## Phase 1: Immediate Blockers

### 1.1 GitHub Actions Secrets Setup

**Status:** CRITICAL - Deployment cannot proceed without these.

Configure these repository secrets in GitHub:

```
Settings → Secrets and variables → Actions
```

**Required secrets:**
- ✅ `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Workers deploy permission
- ✅ `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID  
- ✅ `ADMIN_EMAIL` — Operator login email
- ✅ `ADMIN_PASSWORD` — Strong operator password (32+ characters recommended)
- ✅ `ADMIN_JWT_KEY` — High-entropy JWT signing key (32+ random bytes)

**Optional secrets (add only if configured in Cloudflare):**
- `GITHUB_TOKEN` — GitHub API access
- `OPENAI_API_KEY` — OpenAI fallback
- `GEMINI_API_KEY` — Google Gemini API
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — Optional persistence
- `AGENT_MEMORY_SUPABASE_URL` + `AGENT_MEMORY_SUPABASE_SERVICE_ROLE_KEY` — Agent memory
- `WORKER_SECRET` — Provider token encryption seed
- `EMAIL_FORWARD_TO` — Email routing destination

**How to get Cloudflare API Token:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create token with "Edit Cloudflare Workers" permission
3. Copy token immediately (cannot be viewed again)

**How to get Account ID:**
1. Go to https://dash.cloudflare.com/
2. URL contains: `https://dash.cloudflare.com/{ACCOUNT_ID}`

---

### 1.2 Local Development Verification

**Status:** REQUIRED - Test locally before pushing to CI.

```bash
# Setup
cp .env.example .env

# Fill in .env with test values:
# ADMIN_EMAIL=test@example.com
# ADMIN_PASSWORD=TestPassword123!@#
# ADMIN_JWT_KEY=your-32-byte-random-key-here
# NODE_ENV=development

# Install and verify
npm ci
npm run lint      # TypeScript checks
npm test          # API integration tests
npm run build:web # React + Vite build
npx wrangler deploy --dry-run  # Cloudflare validation

# Start local dev server
npm run dev
# Visit http://localhost:3000
```

**Success criteria:**
- ✅ All npm scripts complete without errors
- ✅ No TypeScript errors in output
- ✅ All tests pass
- ✅ Vite build creates `dist/` directory
- ✅ Wrangler dry-run validates Worker bundle

---

## Phase 2: UI Component Readiness

### 2.1 React Application Status

**Files:** `src/`, `public/`  
**Build:** Vite + TypeScript  
**Output:** `dist/` (served by Cloudflare)

**Checklist:**
- [ ] `npm run build:web` completes without errors
- [ ] No console errors in browser dev tools
- [ ] No secrets/API keys in `src/` or `public/` directories
- [ ] Environment variables use `.env` for local dev only
- [ ] All UI components render correctly
- [ ] Authentication flow works (login → dashboard)
- [ ] Status dashboard accurately reports service health

**To verify locally:**
```bash
npm run build:web
npx http-server dist/ # Serve dist locally
# Visit http://localhost:8080
```

**Common UI issues to check:**
- API endpoints correctly point to `/api/*` paths
- Authentication session management works
- No hardcoded URLs or API keys
- Responsive design works on mobile/tablet
- Dark mode toggle functions properly

---

## Phase 3: API Backend Readiness

### 3.1 Express API Status

**Files:** `server/app.ts`, `server/services/`, `server/auth.ts`  
**Test Suite:** `tests/*.test.ts`  
**Local Entrypoint:** `server.ts`  
**Cloudflare Entrypoint:** `worker/index.ts`

**Checklist:**
- [ ] `npm test` passes all API integration tests
- [ ] All `/api/*` routes return proper JSON
- [ ] Authentication endpoints functional:
  - [ ] `GET /api/health` → 200 OK
  - [ ] `GET /api/auth/readiness` → all auth fields configured
  - [ ] `POST /api/auth/login` with valid credentials
  - [ ] `GET /api/auth/verify-session` with authenticated request
- [ ] Private endpoints require authentication (401 if missing)
- [ ] CORS headers properly configured for Cloudflare
- [ ] No console.log statements leaking secrets
- [ ] Error handling returns appropriate HTTP status codes
- [ ] Provider adapters gracefully handle unavailable services

**To run tests:**
```bash
npm test
# Expected: All tests pass or show clear failures to fix
```

**API test checklist from test files:**
- Health check endpoint
- Authentication flow
- Session validation
- Deployment listing (requires auth)
- Chat API endpoints
- Knowledge document endpoints
- Worker agent simulation (if implemented)

---

### 3.2 Service Integrations

**Status by provider:**

| Provider | Integration | Required? | Status |
|----------|-----------|-----------|--------|
| **Cloudflare Workers AI** | `server/services/aiService.ts` | ✅ YES | Should work with `AI` binding |
| **GitHub** | `server/services/githubService.ts` | ❌ Optional | Requires `GITHUB_TOKEN` |
| **Resend Email** | `server/services/emailService.ts` | ❌ Optional | Requires Cloudflare Email binding |
| **Supabase** | `server/services/supabaseService.ts` | ❌ Optional | Requires credentials |
| **OpenAI** | `server/services/aiService.ts` | ❌ Optional | Fallback provider |
| **Gemini** | `server/services/aiService.ts` | ❌ Optional | Requires API key |

**What to do:**
- Configured providers: Add credentials to Cloudflare secrets
- Unconfigured providers: Ensure they gracefully report "unavailable" in status checks
- Never seed "success" messages for unavailable providers

---

## Phase 4: Cloudflare Worker Deployment

### 4.1 Worker Configuration

**File:** `wrangler.toml`  
**Current bindings:**
```toml
[ai]
binding = "AI"              # Workers AI

[assets]
directory = "./dist"
binding = "ASSETS"          # Static files

[send_email]
name = "EMAIL"              # Transactional email
allowed_sender_addresses = [ "notification@app.jelvan.pro" ]
```

**Checklist:**
- [ ] `wrangler.toml` bindings match Cloudflare console configuration
- [ ] `AI` binding exists in Cloudflare Workers AI
- [ ] `ASSETS` binding directory is `./dist`
- [ ] Email binding domain `app.jelvan.pro` is configured
- [ ] `compatibility_date` is recent (2026-09-01 or later)
- [ ] No secrets in `wrangler.toml` (use `wrangler secret put` instead)

### 4.2 Cloudflare Account Setup

**Email Service:**
- [ ] Domain `app.jelvan.pro` exists
- [ ] Domain added to Cloudflare account
- [ ] Email Sending onboarded for `app.jelvan.pro`
- [ ] Email Routing configured to forward to Worker
- [ ] Test email delivery works

**Workers Configuration:**
- [ ] Workers AI plan enabled
- [ ] Worker named `devai-controller`
- [ ] Custom domain set (if applicable)

**Secrets provisioning (via GitHub Actions):**
The deploy workflow automatically runs:
```bash
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD
wrangler secret put ADMIN_JWT_KEY
wrangler secret put EMAIL_FORWARD_TO  # Optional
```

---

## Phase 5: Pre-Deployment Verification

### 5.1 Local Smoke Tests

Run locally before any CI push:

```bash
# 1. Clean install
rm -rf node_modules dist build package-lock.json
npm ci

# 2. TypeScript validation
npm run lint

# 3. API tests
npm test

# 4. Build
npm run build:web

# 5. Cloudflare validation
npx wrangler deploy --dry-run

# 6. Check output
ls -la dist/           # Should have index.html, JS, CSS
```

**Success criteria:**
- ✅ No errors in any step
- ✅ `dist/` contains 10+ files
- ✅ `package.json` scripts all succeed

### 5.2 Pre-Push Checklist

Before pushing to `main`:

- [ ] All local smoke tests pass
- [ ] `.env` is in `.gitignore` (never commit secrets)
- [ ] `dist/`, `build/` are in `.gitignore`
- [ ] No `console.log(SECRET)` patterns
- [ ] No hardcoded API keys
- [ ] Tests cover critical auth paths
- [ ] Lint issues resolved
- [ ] Git commit message is descriptive

---

## Phase 6: Deployment Process

### 6.1 First Deployment

```bash
# 1. Ensure all GitHub secrets are configured (see Phase 1)

# 2. Commit changes
git add .
git commit -m "Prepare for Cloudflare deployment"

# 3. Push to main (will trigger deploy workflow)
git push origin main

# 4. Watch GitHub Actions
# URL: https://github.com/hr-ai-full-stack-developer/Dev-ai-Controller.v2/actions
```

**Expected workflow:**
1. `verify` job runs (lint, test, build, dry-run)
2. If `verify` passes → `deploy` job runs
3. Secrets provisioned to Cloudflare
4. Worker deployed

### 6.2 Post-Deployment Verification

Once deployment succeeds:

```bash
# Get deployed Worker URL
# From Cloudflare: https://devai-controller.<account>.workers.dev

# Test health endpoint
curl https://devai-controller.<account>.workers.dev/api/health
# Expected: {"status":"ok"}

# Test auth readiness
curl https://devai-controller.<account>.workers.dev/api/auth/readiness
# Expected: {"configured":true,"email":true,"password":true,"jwtKey":true}

# Test authentication
curl -X POST https://devai-controller.<account>.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Open in browser
# https://devai-controller.<account>.workers.dev
```

---

## Phase 7: Troubleshooting Failed Deployments

### Issue: GitHub Actions Secrets Missing

**Error message:** `Missing repository secret CLOUDFLARE_API_TOKEN`

**Solution:**
```
Settings → Secrets and variables → Actions → New repository secret
```
Add all required secrets from Phase 1.1

### Issue: Tests Failing

**Error:** `npm test` fails

**Diagnosis:**
```bash
npm ci
npm test 2>&1 | head -50  # Show first 50 lines
```

**Common causes:**
- Missing `.env` file: `cp .env.example .env`
- Type errors: `npm run lint` to check
- Port already in use: Change `PORT` in `.env`

**Fix:**
- Update test file to match current API
- Ensure mock data matches expected formats
- Check error logs for specific failures

### Issue: Vite Build Failing

**Error:** `npm run build:web` fails

**Diagnosis:**
```bash
npm run build:web 2>&1 | tail -30
```

**Common causes:**
- TypeScript errors in `src/`
- Missing React imports
- CSS/Tailwind misconfiguration
- Large bundle size

**Fix:**
```bash
npm run lint        # Check types
npm run build:web   # Rebuild with full output
```

### Issue: Wrangler Dry-Run Failing

**Error:** `npx wrangler deploy --dry-run` fails

**Diagnosis:**
```bash
npx wrangler deploy --dry-run --verbose
```

**Common causes:**
- Missing `dist/` directory: Run `npm run build:web`
- Invalid `wrangler.toml` syntax
- Missing Cloudflare credentials
- Invalid Node compatibility flags

**Fix:**
```bash
# Verify wrangler.toml syntax
npx wrangler publish --help

# Check local config
npx wrangler env  # Should show production

# Manually deploy
wrangler login  # Authenticate
wrangler deploy
```

### Issue: Worker Returning 500

**After deployment, Worker returns HTTP 500**

**Diagnosis:**
1. Check Cloudflare Worker logs:
   ```
   Cloudflare Dashboard → Workers → devai-controller → Tail Workers
   ```

2. Check Cloudflare Error Messages

3. Common causes:
   - Missing environment variable
   - Binding misconfigured
   - Secret not provisioned

**Solution:**
- Verify all secrets in Cloudflare dashboard
- Check `wrangler.toml` bindings
- Review error logs for specific failure
- Deploy with verbose logging

---

## Phase 8: Monitoring & Ongoing

### 8.1 Health Checks

Set up monitoring for:

```
/api/health                    # Every 5 minutes
/api/auth/readiness            # Every 10 minutes
/api/deployments (authenticated)  # Every 15 minutes
```

**Alert if:**
- Health returns non-200
- Readiness shows `configured: false`
- Response time > 5 seconds

### 8.2 Deployment History

View recent deployments:
```
Cloudflare Dashboard → Workers → devai-controller → Deployments
```

Rollback if needed:
```
Cloudflare Dashboard → Workers → devai-controller → Version history
→ Select previous version → Rollback
```

### 8.3 Log Tail

Watch Worker logs:
```bash
npx wrangler tail
```

---

## Summary: Action Steps

1. **TODAY - Phase 1:**
   - [ ] Add all GitHub Actions secrets
   - [ ] Test locally with `npm ci && npm test`

2. **PHASE 2-3:**
   - [ ] Fix any failing tests
   - [ ] Verify UI builds correctly
   - [ ] Test API endpoints locally

3. **PHASE 4-5:**
   - [ ] Verify `wrangler.toml` configuration
   - [ ] Set up Cloudflare account bindings
   - [ ] Run full pre-deployment checklist

4. **PHASE 6:**
   - [ ] Push to `main` branch
   - [ ] Monitor GitHub Actions workflow
   - [ ] Test deployed Worker endpoints

5. **PHASE 7-8:**
   - [ ] Verify health checks
   - [ ] Set up monitoring
   - [ ] Document any custom configuration

---

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Complete deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) — Pre-release sign-off
- [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md) — Code organization
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

---

**Questions?** Check the [GitHub Issues](https://github.com/hr-ai-full-stack-developer/Dev-ai-Controller.v2/issues) or review the logs from failed Actions runs.
