import { Resend } from 'resend'
import { env } from '../../../config/env'

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  text: string
  html?: string
  organizationId: string
}

const resend = new Resend(env.RESEND_API_KEY)

export async function sendEmail(
  params: SendEmailParams
): Promise<{ messageId: string }> {
  const { data, error } = await resend.emails.send({
    from: 'PropOS <noreply@propos.ai>',
    to: [params.to],
    subject: params.subject,
    text: params.text,
    html: params.html || `<p>${params.text.replace(/\n/g, '<br>')}</p>`,
  })

  if (error) {
    throw new Error(`Email send failed: ${error.message}`)
  }

  return { messageId: data?.id ?? '' }
}
