export interface ExportFile {
  path: string;
  name: string;
  category: 'Documentation' | 'Configuration';
  language: string;
  description: string;
  content: string;
}

/**
 * Export Kit contains reference snippets only. Production files in the repository
 * and wrangler.toml remain authoritative.
 */
export const EXPORT_FILES: ExportFile[] = [
  {
    path: 'DEPLOYMENT-REFERENCE.md',
    name: 'DEPLOYMENT-REFERENCE.md',
    category: 'Documentation',
    language: 'markdown',
    description: 'Short deployment reference. Use the repository DEPLOYMENT.md for complete instructions.',
    content: `# Dev’ai Controller deployment reference

Authoritative Worker entrypoint: worker/index.ts
Authoritative Cloudflare configuration: wrangler.toml

Required operator secrets:
- ADMIN_EMAIL
- ADMIN_PASSWORD
- ADMIN_JWT_KEY

Cloudflare deployment credentials:
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN

Optional integrations:
- GITHUB_TOKEN
- RESEND_API_KEY
- OPENAI_API_KEY
- GEMINI_API_KEY
- SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

Verify before release:
npm ci
npm run lint
npm test
npm run build:web
npx wrangler deploy --dry-run

Do not add D1, R2, Vectorize, KV, Durable Objects, or Cron to documentation until they are implemented and configured in wrangler.toml.
`,
  },
  {
    path: 'wrangler-reference.toml',
    name: 'wrangler-reference.toml',
    category: 'Configuration',
    language: 'toml',
    description: 'Reference matching the current production binding shape. The repository wrangler.toml is authoritative.',
    content: `name = "devai-controller"
main = "worker/index.ts"

[ai]
binding = "AI"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*", "/v1/*"]

[observability]
enabled = true
`,
  },
];
