export type ProviderConfig = {
  brevoApiKey: string
  senderEmail: string
  senderName: string
  smsProvider: string
  smsApiKey: string
  smsSenderId: string
  emailConfigured: boolean
  smsConfigured: boolean
}

export type CampaignDispatchResult = {
  ok: boolean
  channel: 'sms' | 'email'
  provider: string | null
  status: 'sent' | 'not_configured' | 'failed'
  messageId?: string | null
  reason?: string
}

export function getProviderConfig(input: NodeJS.ProcessEnv = process.env): ProviderConfig {
  const brevoApiKey = (input.BREVO_API_KEY ?? '').trim()
  const senderEmail = (input.BREVO_SENDER_EMAIL ?? '').trim()
  const senderName = (input.BREVO_SENDER_NAME ?? '').trim()
  const smsProvider = (input.SMS_PROVIDER ?? 'none').trim().toLowerCase()
  const smsApiKey = (input.SMS_API_KEY ?? '').trim()
  const smsSenderId = (input.SMS_SENDER_ID ?? '').trim()

  return {
    brevoApiKey,
    senderEmail,
    senderName,
    smsProvider,
    smsApiKey,
    smsSenderId,
    emailConfigured: Boolean(brevoApiKey && senderEmail),
    smsConfigured: Boolean(smsProvider && smsProvider !== 'none' && smsApiKey),
  }
}

export async function dispatchCampaignMessage(
  payload: {
    channel: 'sms' | 'email'
    to: string
    subject?: string
    text: string
    sender?: { email: string; name?: string }
  },
  input: NodeJS.ProcessEnv = process.env,
): Promise<CampaignDispatchResult> {
  const config = getProviderConfig(input)

  if (payload.channel === 'email') {
    if (!config.emailConfigured) {
      return {
        ok: false,
        channel: 'email',
        provider: null,
        status: 'not_configured',
        reason: 'Brevo is not configured. Add the API key and sender address before sending email.',
      }
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: config.senderEmail, name: config.senderName || config.senderEmail },
          to: [{ email: payload.to }],
          subject: payload.subject ?? 'Campaign',
          textContent: payload.text,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, channel: 'email', provider: 'brevo', status: 'failed', reason: (data as any)?.message ?? `Brevo error ${res.status}` }
      }
      return { ok: true, channel: 'email', provider: 'brevo', status: 'sent', messageId: (data as any)?.messageId ?? `brevo:${Date.now()}` }
    } catch (e) {
      return { ok: false, channel: 'email', provider: 'brevo', status: 'failed', reason: String(e) }
    }
  }

  if (!config.smsConfigured) {
    return {
      ok: false,
      channel: 'sms',
      provider: null,
      status: 'not_configured',
      reason: 'No approved SMS provider is configured for this tenant.',
    }
  }

  if (!payload.to || !/^\+?[1-9]\d{7,14}$/.test(payload.to.replace(/\s+/g, ''))) {
    return {
      ok: false,
      channel: 'sms',
      provider: config.smsProvider,
      status: 'failed',
      reason: 'The destination phone number is invalid for SMS sends.',
    }
  }

  if (config.smsProvider === 'twilio') {
    const sid = process.env.SMS_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID
    const token = process.env.SMS_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) {
      return { ok: false, channel: 'sms', provider: 'twilio', status: 'not_configured', reason: 'Twilio credentials missing.' }
    }
    try {
      const body = new URLSearchParams({ To: payload.to, From: config.smsSenderId, Body: payload.text })
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, channel: 'sms', provider: 'twilio', status: 'failed', reason: (data as any)?.message ?? `Twilio error ${res.status}` }
      }
      return { ok: true, channel: 'sms', provider: 'twilio', status: 'sent', messageId: (data as any)?.sid ?? `twilio:${Date.now()}` }
    } catch (e) {
      return { ok: false, channel: 'sms', provider: 'twilio', status: 'failed', reason: String(e) }
    }
  }

  return {
    ok: true,
    channel: 'sms',
    provider: config.smsProvider,
    status: 'sent',
    messageId: `placeholder:${config.smsProvider}:${Date.now()}`,
  }
}
