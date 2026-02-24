import sgMail from '@sendgrid/mail'
import { prisma } from '../../../lib/prisma'
import { env } from '../../../config/env'

sgMail.setApiKey(env.SENDGRID_API_KEY)

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  organizationId: string
  messageId?: string
}

function textToHtml(text: string): string {
  return `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    ${text.split('\n').map((line) => `<p>${line}</p>`).join('')}
  </body></html>`
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ messageId: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: params.organizationId },
  })

  const fromAddress = org ? `${org.slug}@mail.propos.ai` : 'noreply@propos.ai'
  const fromName = org?.name ?? 'Your Property Manager'

  const [response] = await sgMail.send({
    to: { email: params.to, name: params.toName },
    from: { email: fromAddress, name: fromName },
    replyTo: params.replyTo ?? fromAddress,
    subject: params.subject,
    text: params.text,
    html: params.html ?? textToHtml(params.text),
    customArgs: {
      organizationId: params.organizationId,
      messageId: params.messageId ?? '',
    },
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
  })

  const messageId = (response.headers['x-message-id'] as string) ?? ''
  return { messageId }
}
