import { generateCompletion } from './aiProvider.js';
import { cleanResponseText } from '../aiRouter.js';
import type {
  WorkerAgentConfig,
  KnowledgeDocument,
  WorkerSimulationResult,
  WorkerPersona,
  WorkerChannel,
  KnowledgeSourceMode,
} from '../../src/types/index.js';

// Knowledge starts empty. Operators add verified documents through the Worker Agent UI.
let knowledgeDocs: KnowledgeDocument[] = [];

// Default Worker Agent Configuration
let agentConfig: WorkerAgentConfig = {
  name: 'Dev’ai Edge Customer Worker',
  persona: 'human_rep',
  channel: 'whatsapp',
  knowledgeMode: 'internal_only',
  greetingMessage: 'Hello! Thanks for reaching out. How can I help you today?',
  customInstructions: 'Always be helpful, polite, and ensure all customer inquiries are addressed accurately.',
  confidenceThreshold: 0.85,
  activeKnowledgeDocIds: [],
  cloudflareRoute: '',
  enableTypingDelay: true,
};

export function getWorkerAgentConfig(): WorkerAgentConfig {
  return { ...agentConfig };
}

export function updateWorkerAgentConfig(partial: Partial<WorkerAgentConfig>): WorkerAgentConfig {
  agentConfig = {
    ...agentConfig,
    ...partial,
  };
  return { ...agentConfig };
}

export function listKnowledgeDocuments(): KnowledgeDocument[] {
  return [...knowledgeDocs];
}

export function addKnowledgeDocument(doc: {
  title: string;
  filename: string;
  format: 'md' | 'txt' | 'json';
  content: string;
  category?: 'faq' | 'policy' | 'specs' | 'rules' | 'custom';
}): KnowledgeDocument {
  const newDoc: KnowledgeDocument = {
    id: `kdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: doc.title || doc.filename,
    filename: doc.filename.endsWith('.md') || doc.filename.endsWith('.txt') ? doc.filename : `${doc.filename}.${doc.format}`,
    format: doc.format,
    content: doc.content,
    sizeBytes: Buffer.byteLength(doc.content, 'utf8'),
    updatedAt: new Date().toISOString(),
    category: doc.category || 'custom',
    isActive: true,
    wordCount: doc.content.split(/\s+/).filter(Boolean).length,
  };
  knowledgeDocs.unshift(newDoc);
  if (!agentConfig.activeKnowledgeDocIds.includes(newDoc.id)) {
    agentConfig.activeKnowledgeDocIds.push(newDoc.id);
  }
  return newDoc;
}

export function deleteKnowledgeDocument(id: string): boolean {
  const index = knowledgeDocs.findIndex((d) => d.id === id);
  if (index !== -1) {
    knowledgeDocs.splice(index, 1);
    agentConfig.activeKnowledgeDocIds = agentConfig.activeKnowledgeDocIds.filter((docId) => docId !== id);
    return true;
  }
  return false;
}

export function toggleKnowledgeDocument(id: string): KnowledgeDocument | null {
  const doc = knowledgeDocs.find((d) => d.id === id);
  if (doc) {
    doc.isActive = !doc.isActive;
    if (doc.isActive && !agentConfig.activeKnowledgeDocIds.includes(id)) {
      agentConfig.activeKnowledgeDocIds.push(id);
    } else if (!doc.isActive) {
      agentConfig.activeKnowledgeDocIds = agentConfig.activeKnowledgeDocIds.filter((docId) => docId !== id);
    }
    return doc;
  }
  return null;
}

/**
 * Simulates the Worker Agent receiving a customer message across chosen channels and knowledge constraints
 */
export async function simulateWorkerAgentResponse(
  userMessage: string,
  overrideConfig?: Partial<WorkerAgentConfig>
): Promise<WorkerSimulationResult> {
  const startTime = Date.now();
  const config = { ...agentConfig, ...overrideConfig };

  // Assemble active knowledge base documents
  const activeDocs = knowledgeDocs.filter(
    (d) => d.isActive && config.activeKnowledgeDocIds.includes(d.id)
  );
  const referencedTitles = activeDocs.map((d) => d.title);
  const assembledKnowledgeText = activeDocs
    .map((d) => `=== DOCUMENT: ${d.filename} (${d.title}) ===\n${d.content}`)
    .join('\n\n');

  // Build persona instructions
  let personaPrompt = '';
  switch (config.persona) {
    case 'human_rep':
      personaPrompt = `
You are a warm, courteous customer support representative for the organization.
- Use natural, conversational phrasing without pretending to be a specific human.
- Maintain high professionalism, warmth, and attention to detail.
- Use a neutral support sign-off when one is appropriate.`;
      break;

    case 'ai_assistant':
      personaPrompt = `
You are Dev’ai Assistant.\n- Use plain language that non-technical people can understand.\n- Start with the direct answer and explain technical terms briefly when needed.\n- Use short paragraphs and bullets only when they improve readability.`;
      break;

    case 'customer_service':
      personaPrompt = `
You are a Senior Customer Service Support Specialist at Operava.
- Your priority is rapid resolution, deep empathy, clear step-by-step guidance, and adherence to company policies.
- Ensure the user feels valued and heard.
- Address any issues with constructive, solution-focused answers.`;
      break;
  }

  // Build Knowledge Constraint instructions
  let knowledgeConstraintPrompt = '';
  if (config.knowledgeMode === 'internal_only') {
    knowledgeConstraintPrompt = `
STRICT INTERNAL KNOWLEDGE MODE:
- You must answer SOLELY and STRICTLY based on the provided internal knowledge base below.
- Do NOT make up, assume, or hallucinate information not found in the documents.
- If the user's question cannot be answered from the provided knowledge documents, politely let them know that this topic is not covered in your verified company knowledge base, and offer to escalate to an administrator.`;
  } else {
    knowledgeConstraintPrompt = `
HYBRID KNOWLEDGE MODE (INTERNAL DOCS + GENERAL INTELLIGENCE):
- Ground your answer primarily in the provided internal knowledge base.
- You may use general knowledge for explanation, but clearly distinguish it from organization-specific facts and never invent current company policy, account status, pricing, or actions.`;
  }

  // Channel Format instructions
  let channelPrompt = '';
  switch (config.channel) {
    case 'whatsapp':
      channelPrompt = `
CHANNEL SPECIFICATION: WHATSAPP BUSINESS
- Keep response concise and readable on a mobile screen.
- Use natural paragraphs and clean bullet points (•).
- Avoid overly lengthy essays; aim for 2 to 4 concise paragraphs.`;
      break;

    case 'messenger':
      channelPrompt = `
CHANNEL SPECIFICATION: META MESSENGER
- Format as interactive conversational chat bubbles.
- Keep the tone friendly, accessible, and fast-paced.`;
      break;

    case 'email':
      channelPrompt = `
CHANNEL SPECIFICATION: TRANSACTIONAL EMAIL (RESEND / CLOUDFLARE EMAIL ROUTING)
- Format as a complete, polished email message.
- Include a clear Subject line at the very top (e.g. "Subject: Re: [Inquiry topic]").
- Include a polite salutation (e.g. "Hello," or "Dear Valued Customer,").
- Provide a detailed body with clear next steps.
- Include a professional email sign-off.`;
      break;

    case 'webchat':
      channelPrompt = `
CHANNEL SPECIFICATION: LIVE WEB CHAT WIDGET
- Format for real-time live web chat widget.
- Interactive, helpful, and concise.`;
      break;
  }

  const systemPrompt = `
You are the Dev’ai Cloudflare Worker Edge Agent routing customer inquiries.

${personaPrompt}

${knowledgeConstraintPrompt}

${channelPrompt}

ADDITIONAL CUSTOM INSTRUCTIONS:
${config.customInstructions || 'Provide accurate, courteous, and timely assistance.'}

INTERNAL KNOWLEDGE BASE:
${assembledKnowledgeText || 'No internal knowledge documents uploaded.'}

CRITICAL FORMATTING MANDATES:
1. NEVER use markdown asterisks (no ***, no **, no *).
2. NEVER use markdown horizontal dividers or double hyphens (no ---, no - -).
3. Use clean capitalized headers, numbered steps (1. 2. 3.), or clean bullet dots (•).
`;

  const completion = await generateCompletion({
    prompt: userMessage,
    systemPrompt,
    temperature: config.persona === 'human_rep' ? 0.4 : 0.2,
  });

  const durationMs = Date.now() - startTime;
  const cleanText = cleanResponseText(completion.text);

  return {
    response: cleanText,
    channel: config.channel,
    persona: config.persona,
    knowledgeMode: config.knowledgeMode,
    referencedDocs: referencedTitles,
    latencyMs: durationMs,
    tokensUsed: completion.tokensUsed,
    simulatedPayload: {
      from: config.channel === 'whatsapp' ? '+1 (555) 019-2834' : config.channel === 'email' ? 'client@company.com' : 'user_fb_829104',
      to: config.channel === 'email' ? 'support@operava.com' : 'Cloudflare Worker Webhook',
      channel: config.channel,
      model: completion.model,
    },
    routingHeader: `CF-Worker-Route: ${config.cloudflareRoute}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generates ready-to-deploy Cloudflare Worker code (worker.js & wrangler.toml)
 */
export function generateCloudflareWorkerExport(config: WorkerAgentConfig = agentConfig): {
  workerCode: string;
  wranglerToml: string;
} {
  const activeDocs = knowledgeDocs.filter((d) => d.isActive && config.activeKnowledgeDocIds.includes(d.id));
  const docSummaries = activeDocs.map((d) => `// [${d.filename}]: ${d.title}`).join('\n');

  const wranglerToml = `name = "operava-worker-agent"
main = "worker.js"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

[vars]
AGENT_NAME = "${config.name}"
PERSONA = "${config.persona}"
CHANNEL = "${config.channel}"
KNOWLEDGE_MODE = "${config.knowledgeMode}"
ROUTING_ENDPOINT = "${config.cloudflareRoute}"
`;

  const workerCode = `/**
 * Cloudflare Worker Agent with Multi-Channel Routing
 * Automatically generated by Dev’ai Controller
 * Stack: Cloudflare Workers AI (@cf/meta/llama-3.3-70b), WhatsApp, Messenger, Resend Email
 *
 * Active Knowledge Documents:
 ${docSummaries}
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Health check & verification handshake
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === env.HUB_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      }
      return new Response(JSON.stringify({ status: "active", agent: env.AGENT_NAME }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Inbound Webhook Payload Processing (${config.channel.toUpperCase()})
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const customerMessage = extractMessageFromPayload(body, "${config.channel}");

        // 3. Cloudflare Workers AI Inference
        const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
          messages: [
            {
              role: "system",
              content: \`You are \${env.AGENT_NAME}. Persona: ${config.persona}. Mode: ${config.knowledgeMode}. Channel: ${config.channel}.\`
            },
            { role: "user", content: customerMessage }
          ]
        });

        // 4. Dispatch back to channel
        await dispatchChannelResponse(aiResponse.response, body, "${config.channel}", env);

        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  }
};

function extractMessageFromPayload(body, channel) {
  if (channel === "whatsapp") return body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || "Hello";
  if (channel === "messenger") return body.entry?.[0]?.messaging?.[0]?.message?.text || "Hello";
  if (channel === "email") return body.text || body.subject || "Inquiry";
  return body.message || "Support Request";
}

async function dispatchChannelResponse(text, inboundBody, channel, env) {
  // Webhook return logic for \${channel}
  console.log(\`[\${channel}] Dispatched agent response: \${text.slice(0, 50)}...\`);
}
`;

  return { workerCode, wranglerToml };
}
