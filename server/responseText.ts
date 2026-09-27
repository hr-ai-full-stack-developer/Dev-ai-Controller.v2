export function cleanResponseText(text: string, allowSensitiveAudit: boolean = false): string {
  if (!text) return '';
  let cleaned = text
    // Remove triple asterisks
    .replace(/\*{3}([^*]+)\*{3}/g, '$1')
    // Remove double asterisks
    .replace(/\*{2}([^*]+)\*{2}/g, '$1')
    // Remove single asterisks
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove leftover raw asterisks
    .replace(/\*{1,3}/g, '')
    // Remove markdown headers #, ##, ###, ####
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown horizontal rules (---, - - -, etc.)
    .replace(/^[\s-]{3,}$/gm, '')
    .replace(/-\s*-\s*-+/g, '')
    .replace(/-\s*-/g, '—')
    // Convert markdown bullet dashes "- " or "* " to clean bullet points "• "
    .replace(/^[\t ]*[-*]\s+/gm, '• ')
    // Ensure clean line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If user did not explicitly ask for the audit, strip the sensitive audit block
  if (!allowSensitiveAudit) {
    cleaned = cleaned
      .replace(/Completed security audit:\s*Cloudflare Workers AI model\s*`?@cf\/meta\/llama-3\.3-70b-instruct`?\s*is operational at 22ms latency\.\s*Fallback OpenAI\s*`?gpt-4o-mini`?\s*is active on standby\.\s*All worker secrets are derived using AES-256-GCM without exposing raw values to the browser\./gi, '')
      .replace(/Completed security audit:\s*Cloudflare Workers AI model\s*`?@cf\/meta\/llama-3\.3-70b-instruct`?\s*is operational at 22ms latency\./gi, '')
      .trim();
  }

  return cleaned;
}

