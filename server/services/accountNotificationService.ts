import { getAdminAuthConfig } from '../auth.js';
import { createNotification } from './notificationsService.js';
import { operavaEmailTemplate, sendTransactionalEmail } from './emailDeliveryService.js';

export type AccountNoticeKind = 'login_success' | 'login_failed' | 'otp_requested' | 'otp_verified' | 'account_action';

const copy: Record<AccountNoticeKind, { subject: string; title: string; eyebrow: string }> = {
  login_success: { subject: 'OPERAVA sign-in notice', title: 'Successful sign-in', eyebrow: 'Account security' },
  login_failed: { subject: 'OPERAVA security alert', title: 'Unsuccessful sign-in attempt', eyebrow: 'Security alert' },
  otp_requested: { subject: 'OPERAVA verification requested', title: 'Verification code requested', eyebrow: 'Account security' },
  otp_verified: { subject: 'OPERAVA verification completed', title: 'Verification completed', eyebrow: 'Account security' },
  account_action: { subject: 'OPERAVA account activity', title: 'Account action completed', eyebrow: 'Account activity' },
};

export async function notifyAdminAccountEvent(kind: AccountNoticeKind, message: string, metadata: Record<string, string | number | boolean> = {}) {
  const recipient = getAdminAuthConfig().email.trim();
  if (!recipient) return { delivered: false, reason: 'Administrator email is not configured.' };
  const item = copy[kind];
  await createNotification({
    service: 'system',
    type: kind === 'login_failed' ? 'security_alert' : 'provider_event',
    title: item.title,
    message,
    status: 'acknowledged',
    recipient,
    metadata: { channel: 'in-app', ...metadata },
  });
  try {
    const delivery = await sendTransactionalEmail({
      to: recipient,
      subject: item.subject,
      html: operavaEmailTemplate({ eyebrow: item.eyebrow, title: item.title, message }),
      text: message,
    });
    await createNotification({
      service: 'cloudflare',
      type: 'email_sent',
      title: item.title,
      message: 'Security/account email accepted by Cloudflare Email Service.',
      status: 'sent',
      recipient,
      sourceId: delivery.id ? `email:${delivery.id}` : undefined,
      metadata: { channel: 'email', event: kind },
    });
    return { delivered: true, provider: delivery.provider };
  } catch (error: any) {
    await createNotification({
      service: 'cloudflare',
      type: 'security_alert',
      title: `${item.title} — email unavailable`,
      message: 'The in-app notice was recorded, but the security email could not be delivered.',
      status: 'failed',
      recipient,
      metadata: { channel: 'email', event: kind },
    });
    console.error('Account notification email failed:', error);
    return { delivered: false, reason: error?.message || 'Email delivery failed.' };
  }
}
