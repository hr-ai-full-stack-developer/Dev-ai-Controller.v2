export interface SendEmailParams {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}

type EmailBinding = { send(message: { to: string | string[]; from: string; subject: string; html?: string; text?: string; replyTo?: string }): Promise<any> };
let cloudflareEmail: EmailBinding | null = null;

export function setCloudflareEmailBinding(binding: EmailBinding | null | undefined) {
  cloudflareEmail = binding || null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
}

export function operavaEmailTemplate(input: { eyebrow?: string; title: string; message: string; code?: string; actionLabel?: string; actionUrl?: string }) {
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message).replace(/\n/g, '<br/>');
  const code = input.code ? escapeHtml(input.code) : '';
  const actionUrl = input.actionUrl && /^https:\/\//i.test(input.actionUrl) ? input.actionUrl : '';
  const actionLabel = input.actionLabel ? escapeHtml(input.actionLabel) : '';
  return `<!doctype html><html><body style="margin:0;background:#f6f7f5;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f5;padding:32px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
    <tr><td style="height:5px;background:linear-gradient(90deg,#7c3aed,#f97316)"></td></tr>
    <tr><td style="padding:34px 36px 16px">
      <div style="font-size:20px;font-weight:800;letter-spacing:.08em">OPERAVA</div>
      <div style="margin-top:5px;font-size:11px;color:#6b7280;letter-spacing:.12em;text-transform:uppercase">Global Solutions · Operating in Advance</div>
    </td></tr>
    <tr><td style="padding:12px 36px 34px">
      ${input.eyebrow ? `<div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px">${escapeHtml(input.eyebrow)}</div>` : ''}
      <h1 style="font-size:25px;line-height:1.25;margin:0 0 14px">${title}</h1>
      <p style="font-size:15px;line-height:1.7;color:#4b5563;margin:0">${message}</p>
      ${code ? `<div style="margin:26px 0;padding:18px;text-align:center;background:#f8f7ff;border:1px solid #e9e5ff;border-radius:14px;font-size:30px;font-weight:800;letter-spacing:.22em">${code}</div>` : ''}
      ${actionUrl && actionLabel ? `<div style="margin-top:26px"><a href="${actionUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:700">${actionLabel}</a></div>` : ''}
    </td></tr>
    <tr><td style="padding:20px 36px;border-top:1px solid #eef0f2;font-size:11px;line-height:1.6;color:#8a8f98">
      Automation, Technology, Workforce and Global Business Outsourcing Solutions<br/>This is an automated transactional message from OPERAVA GLOBAL SOLUTIONS.
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export const OPERAVA_EMAIL_FROM = 'Operava <noreply@internal.operavaglobal.com>';
export type DeliveryResult = { provider: 'cloudflare-email'; id?: string };

export async function sendTransactionalEmail(params: SendEmailParams): Promise<DeliveryResult> {
  if (!cloudflareEmail) throw new Error('Cloudflare Email Service binding is not available.');
  const response = await cloudflareEmail.send({
    to: params.to,
    from: OPERAVA_EMAIL_FROM,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  return { provider: 'cloudflare-email', id: response?.messageId };
}
