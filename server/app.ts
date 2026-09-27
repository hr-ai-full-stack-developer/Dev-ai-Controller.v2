import express from 'express';
import {
  listAuditLogs,
  listChatSessions,
  createChatSession,
  getChatSession,
  deleteChatSession,
  addChatMessage,
  clearChatMessages,
} from './storage.js';
import { getServicesStatus } from './services/statusService.js';
import { listDeployedApps, triggerDeployment, rollbackDeployment } from './services/deploymentsService.js';
import { listNotifications, createNotification } from './services/notificationsService.js';
import { listCodingTasks, executeCodingTask } from './services/codingAgentService.js';
import { getLLMDocs, refreshDoc } from './services/llmsDocs.js';
import { generateCompletion } from './services/aiProvider.js';
import { executeAiAction, cleanResponseText } from './aiRouter.js';
import { rememberAgentMemory, listAgentMemory, isDurableAgentMemoryConfigured } from './services/agentMemoryService.js';
import { listAgentCapabilities } from './services/agentCapabilityService.js';
import {
  getWorkerAgentConfig,
  updateWorkerAgentConfig,
  listKnowledgeDocuments,
  addKnowledgeDocument,
  deleteKnowledgeDocument,
  toggleKnowledgeDocument,
  simulateWorkerAgentResponse,
  generateCloudflareWorkerExport,
} from './services/workerAgentService.js';
import {
  getAdminAuthConfig,
  isAdminAuthConfigured,
  generateEmailOtp,
  verifyEmailOtp,
  verifyAuthenticatorOtp,
  getAuthenticatorSecret,
  verifyAdminOtp,
  validateAdminCredentials,
  createAdminJwt,
  verifyAdminJwt,
  getAdminUserProfile,
} from './auth.js';
import { operavaEmailTemplate, sendTransactionalEmail } from './services/emailDeliveryService.js';
import {
  listPlatformAgents,
  getPlatformAgent,
  listTools,
  listMcpServers,
  listKnowledgeItems,
  addKnowledgeItem,
  listAutomations,
  getAutomation,
  listExecutionLogs,
  getCustomerWidgetConfig,
  interpretNaturalLanguageAutomation,
  approveAutomation,
  cancelAutomation,
  runAutomationNow,
  getAgentKnowledgeReferences,
  getAgentStructureFlow,
  getCompatibleKnowledgeForAgent,
  linkKnowledgeToAgent,
  unlinkKnowledgeFromAgent,
  simulateAgentFlow,
} from './services/agentPlatformService.js';

// All private routes use the same validated session in Node and Workers.
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const bearer = req.headers.authorization?.replace(/^Bearer /, '');
  const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('devai_session='))?.slice(14);
  const payload = verifyAdminJwt(bearer || cookie || '');
  if (!payload) return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
  (req as any).user = payload;
  next();
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/v1/')) return next();
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      const origin = new URL(req.headers.origin);
      if (origin.host !== req.headers.host) return res.status(403).json({ success: false, error: 'Cross-origin request rejected.' });
    }
    const publicRoutes = ['/api/health', '/api/auth/login', '/api/auth/readiness', '/api/auth/reset-password', '/api/auth/email-otp/request', '/api/auth/email-otp/verify', '/v1/widget/chat'];
    if (publicRoutes.includes(req.path)) return next();
    return requireAdminAuth(req, res, next);
  });

  // Health endpoint
  app.get('/api/health', async (req, res) => {
    res.json({
      status: 'healthy',
      app: 'Dev’ai Controller',
      version: '2.5.0',
      runtime: process.env.CF_PAGES || process.env.CLOUDFLARE_ACCOUNT_ID ? 'Cloudflare-compatible' : 'Node/local',
      integrations: {
        cloudflareApi: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
        github: Boolean(process.env.GITHUB_TOKEN),
        resend: Boolean(process.env.RESEND_API_KEY),
        supabase: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)),
        openaiFallback: Boolean(process.env.OPENAI_API_KEY),
      },
      adminConfigured: isAdminAuthConfigured(),
    });
  });

  // 1. Services Operational Status (Resend, Supabase, GitHub, Cloudflare, OpenAI fallback)
  app.get('/api/status', async (req, res) => {
    try {
      const statusData = await getServicesStatus();
      res.json({ success: true, ...statusData });
    } catch (err: any) {
      console.error('Error fetching services status:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Deployed Applications Monitoring
  app.get('/api/deployments', async (req, res) => {
    try {
      const deployments = await listDeployedApps();
      res.json({ success: true, deployments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/deployments/trigger', requireAdminAuth, async (req, res) => {
    try {
      const { appId, user } = req.body;
      if (!appId) {
        return res.status(400).json({ success: false, error: 'appId is required' });
      }
      const result = await triggerDeployment(appId, user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/deployments/rollback', requireAdminAuth, async (req, res) => {
    try {
      const { appId, user } = req.body;
      if (!appId) {
        return res.status(400).json({ success: false, error: 'appId is required' });
      }
      const result = await rollbackDeployment(appId, user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Notifications & Activity Monitor
  app.get('/api/notifications', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const notifications = await listNotifications(limit);
      res.json({ success: true, notifications });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Coding Agent Workspace ("Drive Coding")
  app.get('/api/coding/tasks', async (req, res) => {
    try {
      const tasks = await listCodingTasks();
      res.json({ success: true, tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/coding/execute', requireAdminAuth, async (req, res) => {
    try {
      const { prompt, repo, branch, user } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Coding prompt is required' });
      }
      const task = await executeCodingTask(prompt, repo, branch, user);
      res.json({ success: true, task });
    } catch (err: any) {
      console.error('Error executing coding task:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Authentication & Login (credentials resolved at request time for Cloudflare bindings)
  // Provides Authenticator App setup configuration
  app.get('/api/auth/authenticator-setup', (req, res) => {
    try {
      const setup = getAuthenticatorSecret();
      res.json({
        success: true,
        secret: setup.secret,
        otpauthUrl: setup.otpauthUrl,
        issuer: setup.issuer,
        account: setup.account,
        stepSeconds: 30,
        algorithm: 'SHA1',
        digits: 6,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/auth/verify-session', (req, res) => {
    res.json({ success: true, valid: true, user: getAdminUserProfile() });
  });
  app.get('/api/auth/me', (req, res) => {
    res.json({ success: true, user: getAdminUserProfile() });
  });
  app.get('/api/auth/readiness', (_req, res) => {
    const config = getAdminAuthConfig();
    res.json({ success: true, configured: isAdminAuthConfigured(), fields: { email: Boolean(config.email), password: Boolean(config.password), jwtKey: Boolean(config.jwtKey) } });
  });
  app.post('/api/auth/login', (req, res) => {
    if (!isAdminAuthConfigured()) return res.status(503).json({ success: false, error: 'Administrator sign-in has not been configured on the server.' });
    if (!validateAdminCredentials(req.body.email, req.body.password)) return res.status(401).json({ success: false, error: 'Email or password is incorrect.' });
    const user = getAdminUserProfile();
    const token = createAdminJwt({ id: user.id, email: user.email, role: user.role });
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('devai_session', token, { httpOnly: true, secure, sameSite: 'strict', path: '/', ...(req.body.rememberMe ? { maxAge: 86400000 * 7 } : {}) });
    res.json({ success: true, user });
  });
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('devai_session', { path: '/' });
    res.json({ success: true });
  });
  const emailOtpRequests = new Map<string, number>();
  app.post('/api/auth/email-otp/request', async (req, res) => {
    const requested = String(req.body?.email || '').trim().toLowerCase();
    const adminEmail = getAdminAuthConfig().email.trim().toLowerCase();
    // Generic response avoids disclosing the configured administrator address.
    const accepted = { success: true, message: 'If this address is authorized, a verification code will be sent.' };
    if (!requested || requested !== adminEmail || !isAdminAuthConfigured()) return res.json(accepted);
    const last = emailOtpRequests.get(requested) || 0;
    if (Date.now() - last < 60_000) return res.status(429).json({ success: false, error: 'Please wait before requesting another code.' });
    try {
      const { otp, expiresAt } = generateEmailOtp(requested);
      const html = operavaEmailTemplate({
        eyebrow: 'Secure verification',
        title: 'Your OPERAVA verification code',
        message: 'Use this code to confirm your identity. It expires shortly. If you did not request this code, you can ignore this email.',
        code: otp,
      });
      const delivery = await sendTransactionalEmail({
        to: requested,
        subject: 'Your OPERAVA verification code',
        html,
        text: `Your OPERAVA verification code is ${otp}. It expires at ${new Date(expiresAt).toISOString()}.`,
      });
      emailOtpRequests.set(requested, Date.now());
      return res.json({ ...accepted, delivery: { provider: delivery.provider, fallbackUsed: delivery.fallbackUsed } });
    } catch (err: any) {
      console.error('Email OTP delivery failed:', err);
      return res.status(503).json({ success: false, error: 'Verification email could not be delivered.' });
    }
  });

  app.post('/api/auth/email-otp/verify', (req, res) => {
    const requested = String(req.body?.email || '').trim().toLowerCase();
    const adminEmail = getAdminAuthConfig().email.trim().toLowerCase();
    if (!requested || requested !== adminEmail || !verifyEmailOtp(requested, String(req.body?.otp || ''))) {
      return res.status(401).json({ success: false, verified: false, error: 'Verification code is invalid or expired.' });
    }
    return res.json({ success: true, verified: true });
  });

  app.post('/api/email/send', async (req, res) => {
    try {
      const { to, subject, title, message, actionLabel, actionUrl } = req.body || {};
      if (!to || !subject || !title || !message) return res.status(400).json({ success: false, error: 'to, subject, title, and message are required.' });
      const html = operavaEmailTemplate({ eyebrow: 'OPERAVA update', title, message, actionLabel, actionUrl });
      const delivery = await sendTransactionalEmail({ to, subject, html, text: message });
      res.json({ success: true, delivery });
    } catch (err: any) {
      res.status(503).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/reset-password', (_req, res) => {
    res.status(501).json({ success: false, error: 'Password recovery is not configured. Ask your administrator to reset your access.' });
  });

  // 6. Natural Language AI Assistant / Action Router
  app.post('/api/ai', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      const completion = await generateCompletion({
        prompt,
        systemPrompt: 'You are Dev’ai Controller Assistant. You orchestrate Cloudflare Workers, Cloudflare AI, GitHub repositories, Supabase databases, and Resend transactional notifications.',
      });

      res.json({
        success: true,
        message: completion.text,
        provider: completion.provider,
        model: completion.model,
        latencyMs: completion.latencyMs,
      });
    } catch (err: any) {
      console.error('Error in /api/ai:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6b. Chat Sessions & History Management
  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const sessions = await listChatSessions();
      res.json({ success: true, sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/chat/sessions', async (req, res) => {
    try {
      const { title, tags } = req.body;
      const session = await createChatSession(title, tags);
      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/chat/sessions/:id', async (req, res) => {
    try {
      const sessionData = await getChatSession(req.params.id);
      if (!sessionData) {
        return res.status(404).json({ success: false, error: 'Chat session not found' });
      }
      res.json({ success: true, ...sessionData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/chat/sessions/:id', async (req, res) => {
    try {
      const deleted = await deleteChatSession(req.params.id);
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/chat/sessions/:id/clear', async (req, res) => {
    try {
      const cleared = await clearChatMessages(req.params.id);
      res.json({ success: true, cleared });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/chat/sessions/:id/messages', async (req, res) => {
    try {
      const { id: sessionId } = req.params;
      const { content, user } = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      // Save User Message
      const userMessage = await addChatMessage(sessionId, {
        role: 'user',
        content: content.trim(),
      });

      // Execute AI action or completion
      try {
        const actionResult = await executeAiAction(content);

        // Assistant Message
        const assistantMessage = await addChatMessage(sessionId, {
          role: 'assistant',
          content: cleanResponseText(actionResult.message),
          steps: actionResult.steps,
          actionExecuted: actionResult.actionExecuted,
          service: (actionResult.provider as any) || 'system',
          status: actionResult.status,
          logId: actionResult.logId,
          resultData: actionResult.resultData,
          aiProvider: actionResult.aiProvider,
          model: actionResult.model,
        });

        res.json({ success: true, userMessage, assistantMessage });
      } catch (aiErr: any) {
        const rawErr = (aiErr.message || '').toLowerCase();
        let simpleSummary = 'Dev’ai Controller encountered a temporary hiccup communicating with the selected provider.';
        let actionableFix = 'You can click retry below. The system automatically switches to the OpenAI standby provider if Cloudflare AI is unresponsive.';

        if (rawErr.includes('429') || rawErr.includes('rate') || rawErr.includes('quota')) {
          simpleSummary = 'Too many requests were sent in a brief moment (Rate Limit).';
          actionableFix = 'Please wait 10–15 seconds before retrying, or rely on the standby backup engine.';
        } else if (rawErr.includes('401') || rawErr.includes('unauthorized') || rawErr.includes('key') || rawErr.includes('token')) {
          simpleSummary = 'The service credentials or API secret need verification.';
          actionableFix = 'Verify that the secret environment variables in Cloudflare or .env are valid and not expired.';
        } else if (rawErr.includes('timeout') || rawErr.includes('etimedout') || rawErr.includes('econnrefused')) {
          simpleSummary = 'The network connection took longer than expected to respond (Timeout).';
          actionableFix = 'Check that your network is stable and re-run your prompt. The Edge fallback will handle retries.';
        }

        const nonTechExplanation = {
          simpleSummary,
          actionableFix,
          technicalDetails: aiErr.message || 'Internal executor error',
          suggestedActionLabel: 'Retry Operation',
        };

        const assistantMessage = await addChatMessage(sessionId, {
          role: 'assistant',
          content: `Unable to complete execution due to an error: ${aiErr.message || 'Service unreachable'}.`,
          status: 'error',
          error: aiErr.message,
          nonTechExplanation,
        });

        res.json({ success: true, userMessage, assistantMessage });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Audit Logs
  app.get('/api/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await listAuditLogs(limit);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/agents/capabilities', (_req, res) => {
    res.json({ success: true, capabilities: listAgentCapabilities() });
  });

  // Durable agent memory: processes can be permanent; normal episodic/knowledge memory expires by policy.
  app.get('/api/agents/memory', async (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || 'tenant_prod_edge_001');
      const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
      const kind = req.query.kind ? String(req.query.kind) as any : undefined;
      const memories = await listAgentMemory({ tenantId, agentId, kind });
      res.json({ success: true, durable: isDurableAgentMemoryConfigured(), memories });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.post('/api/agents/memory', requireAdminAuth, async (req, res) => {
    try {
      const { tenantId = 'tenant_prod_edge_001', agentId, kind, title, content, importance, expiresAt, metadata } = req.body;
      if (!['process','knowledge','episodic'].includes(kind)) return res.status(400).json({ success: false, error: 'kind must be process, knowledge, or episodic' });
      const memory = await rememberAgentMemory({ tenantId, agentId, kind, title, content, importance, expiresAt, metadata, source: 'operator' });
      res.json({ success: true, durable: isDurableAgentMemoryConfigured(), memory });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 8. LLM Docs Endpoints
  app.get('/api/docs/llms', async (req, res) => {
    try {
      const docs = await getLLMDocs();
      res.json({ success: true, docs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/docs/llms/refresh', async (req, res) => {
    try {
      const { id } = req.body;
      const refreshed = await refreshDoc(id);
      res.json({ success: true, doc: refreshed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Worker Agent Configuration & Multi-Channel Routing
  app.get('/api/worker-agent/config', (req, res) => {
    try {
      const config = getWorkerAgentConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/worker-agent/config', requireAdminAuth, (req, res) => {
    try {
      const updated = updateWorkerAgentConfig(req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Worker Agent Knowledge Base Documents (.txt, .md)
  app.get('/api/worker-agent/knowledge', (req, res) => {
    try {
      const docs = listKnowledgeDocuments();
      res.json({ success: true, docs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/worker-agent/knowledge', requireAdminAuth, (req, res) => {
    try {
      const { title, filename, format, content, category } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Document content is required' });
      }
      const newDoc = addKnowledgeDocument({
        title: title || filename || 'Custom Knowledge Document',
        filename: filename || 'knowledge_notes.md',
        format: format === 'txt' ? 'txt' : 'md',
        content,
        category,
      });
      res.json({ success: true, document: newDoc });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/worker-agent/knowledge/:id', requireAdminAuth, (req, res) => {
    try {
      const deleted = deleteKnowledgeDocument(req.params.id);
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/worker-agent/knowledge/:id/toggle', requireAdminAuth, (req, res) => {
    try {
      const doc = toggleKnowledgeDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, document: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Live Worker Agent Simulator (tests WhatsApp, Messenger, Email, or Webchat routing with internal vs external knowledge)
  app.post('/api/worker-agent/simulate', async (req, res) => {
    try {
      const { message, config } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Customer message is required' });
      }
      const simulationResult = await simulateWorkerAgentResponse(message, config);
      res.json({ success: true, ...simulationResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export Production Cloudflare Worker code and wrangler.toml
  app.get('/api/worker-agent/export', (req, res) => {
    try {
      const exportFiles = generateCloudflareWorkerExport();
      res.json({ success: true, ...exportFiles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================
  // 10. GENERAL AI AGENT PLATFORM API (Spec v1.0 /v1 namespace)
  // ============================================================

  // Embeddable Customer Service Widget Script
  app.get('/v1/agents', (req, res) => {
    res.json({ success: true, agents: listPlatformAgents() });
  });

  app.get('/v1/agents/:id', (req, res) => {
    const agent = getPlatformAgent(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, agent });
  });

  // Agent Structure Flow & Pipeline
  app.get('/v1/agents/:id/flow', (req, res) => {
    const flow = getAgentStructureFlow(req.params.id);
    if (!flow) return res.status(404).json({ success: false, error: 'Structure flow not found for agent' });
    res.json({ success: true, flow });
  });

  // Agent Knowledge References & Compatible Knowledge
  app.get('/v1/agents/:id/knowledge', (req, res) => {
    const references = getAgentKnowledgeReferences(req.params.id);
    res.json({ success: true, references });
  });

  app.get('/v1/agents/:id/compatible-knowledge', (req, res) => {
    const compatibleItems = getCompatibleKnowledgeForAgent(req.params.id);
    res.json({ success: true, items: compatibleItems });
  });

  app.post('/v1/agents/:id/knowledge/link', (req, res) => {
    try {
      const { titleId, purpose } = req.body;
      if (!titleId) return res.status(400).json({ success: false, error: 'titleId is required' });
      const result = linkKnowledgeToAgent(req.params.id, titleId, purpose);
      if (!result.success) return res.status(400).json(result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/v1/agents/:id/knowledge/unlink', (req, res) => {
    try {
      const { titleId } = req.body;
      if (!titleId) return res.status(400).json({ success: false, error: 'titleId is required' });
      const result = unlinkKnowledgeFromAgent(req.params.id, titleId);
      if (!result.success) return res.status(400).json(result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Live Agent Pipeline Flow Simulation
  app.post('/v1/agents/:id/simulate-flow', (req, res) => {
    try {
      const { prompt } = req.body;
      const result = simulateAgentFlow(req.params.id, prompt);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Tool Registry & MCP Servers
  app.get('/v1/tools', (req, res) => {
    res.json({ success: true, tools: listTools() });
  });

  app.get('/v1/mcp', (req, res) => {
    res.json({ success: true, mcpServers: listMcpServers() });
  });

  // Knowledge Ingestion & Attached Knowledge Items with Title IDs
  app.get('/v1/knowledge', (req, res) => {
    res.json({ success: true, items: listKnowledgeItems() });
  });

  app.post('/v1/knowledge', (req, res) => {
    try {
      const { title, titleId, type, content, summary } = req.body;
      if (!title || !titleId) {
        return res.status(400).json({ success: false, error: 'Title and Title ID are required' });
      }
      const newItem = addKnowledgeItem({
        title,
        titleId,
        type: type || 'Markdown',
        status: 'Available',
        summary: summary || title,
        content: content || '',
      });
      res.json({ success: true, item: newItem });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Automations & Natural Language Parser
  app.get('/v1/automations', (req, res) => {
    const status = req.query.status as any;
    res.json({ success: true, automations: listAutomations(status) });
  });

  app.get('/v1/automations/:id', (req, res) => {
    const auto = getAutomation(req.params.id);
    if (!auto) return res.status(404).json({ success: false, error: 'Automation not found' });
    res.json({ success: true, automation: auto });
  });

  app.post('/v1/automations/parse', (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
      const result = interpretNaturalLanguageAutomation(prompt);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Consequential Action Approvals
  app.post('/v1/automations/:id/approve', (req, res) => {
    const result = approveAutomation(req.params.id);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  });

  app.post('/v1/automations/:id/cancel', (req, res) => {
    const result = cancelAutomation(req.params.id);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  });

  app.post('/v1/automations/:id/run', (req, res) => {
    const result = runAutomationNow(req.params.id);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  });

  // Execution Audit Logs
  app.get('/v1/executions', (req, res) => {
    const autoId = req.query.automationId as string;
    res.json({ success: true, logs: listExecutionLogs(autoId) });
  });

  // Customer Service Widget Configuration & Chat
  app.get('/v1/widget/config', (req, res) => {
    res.json({ success: true, config: getCustomerWidgetConfig() });
  });

  app.post('/v1/widget/chat', async (req, res) => {
    try {
      const { message, tenantId, agentId } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      // Ground response with customer service knowledge
      const completion = await generateCompletion({
        prompt: `Customer message: "${message}". You are the Customer Service Agent. Answer politely, accurately, and only use general policy facts. Do not reveal internal API tokens.`,
        systemPrompt: 'You are the embeddable customer service AI representative. Be brief, warm, and professional.',
      });

      res.json({
        success: true,
        reply: completion.text,
        tenantId: tenantId || 'tenant_prod_edge_001',
        agentId: agentId || 'agent-customer-01',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use(['/api', '/v1'], (_req, res) => {
    res.status(404).json({ success: false, error: 'API route not found.' });
  });
  return app;
}
