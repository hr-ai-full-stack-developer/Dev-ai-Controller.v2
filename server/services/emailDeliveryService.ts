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

export function devaiEmailTemplate(input: { eyebrow?: string; title: string; message: string; code?: string; actionLabel?: string; actionUrl?: string }) {
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message).replace(/\n/g, '<br/>');
  const code = input.code ? escapeHtml(input.code) : '';
  const actionUrl = input.actionUrl && /^https:\/\//i.test(input.actionUrl) ? input.actionUrl : '';
  const actionLabel = input.actionLabel ? escapeHtml(input.actionLabel) : '';
  return `<!doctype html><html><body style="margin:0;background:#f8f5e9;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5e9;padding:36px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf7;border:1px solid #eadfbd;border-radius:24px;overflow:hidden;box-shadow:0 12px 32px rgba(120,83,20,.08)">
    <tr><td style="height:6px;background:linear-gradient(90deg,#f97316 0%,#fb923c 48%,#facc15 100%)"></td></tr>
    <tr><td style="padding:34px 38px 18px;background:linear-gradient(135deg,#fffaf0 0%,#fff7d6 100%)">
      <div style="display:inline-block;padding:8px 12px;border-radius:12px;background:#fff3c4;border:1px solid #f6d978;font-size:18px;font-weight:800;letter-spacing:.02em;color:#29200d">Dev’ai Controller</div>
      <div style="margin-top:10px;font-size:11px;color:#8a6a25;letter-spacing:.12em;text-transform:uppercase">Secure operator notifications</div>
    </td></tr>
    <tr><td style="padding:24px 38px 36px">
      ${input.eyebrow ? `<div style="font-size:11px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.12em;margin-bottom:11px">${escapeHtml(input.eyebrow)}</div>` : ''}
      <h1 style="font-size:25px;line-height:1.25;margin:0 0 14px;color:#211b0d">${title}</h1>
      <p style="font-size:15px;line-height:1.7;color:#62583f;margin:0">${message}</p>
      ${code ? `<div style="margin:26px 0;padding:20px;text-align:center;background:#fff8d8;border:1px solid #f4d76f;border-radius:16px;font-size:30px;font-weight:800;letter-spacing:.22em;color:#9a4a0a">${code}</div>` : ''}
      ${actionUrl && actionLabel ? `<div style="margin-top:26px"><a href="${actionUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:800;box-shadow:0 5px 14px rgba(249,115,22,.2)">${actionLabel}</a></div>` : ''}
    </td></tr>
    <tr><td style="padding:22px 38px;border-top:1px solid #f1e5bd;background:#fffaf0;text-align:center;font-size:11px;line-height:1.7;color:#8a7a55">
      This is an automated security or account notification from Dev’ai Controller.<br/>
      <strong style="color:#6f5d34">All right reserved @Jelvan Ricolcol 2026.</strong>
    </td></tr>
  </table></td></tr></table></body></html>`;
}}

export const DEVAI_EMAIL_FROM = 'Dev’ai Controller <notification@app.jelvan.pro>';
export type DeliveryResult = { provider: 'cloudflare-email'; id?: string };

export async function sendTransactionalEmail(params: SendEmailParams): Promise<DeliveryResult> {
  if (!cloudflareEmail) throw new Error('Cloudflare Email Service binding is not available.');
  const response = await cloudflareEmail.send({
    to: params.to,
    from: DEVAI_EMAIL_FROM,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  return { provider: 'cloudflare-email', id: response?.messageId };
}
