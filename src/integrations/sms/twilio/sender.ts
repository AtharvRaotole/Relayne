import twilio from 'twilio'
import { prisma } from '../../../lib/prisma'
import { env } from '../../../config/env'

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

export async function sendSms(params: {
  to: string
  body: string
  organizationId: string
}): Promise<{ messageSid: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: params.organizationId },
  })

  const fromNumber = (org?.settings as Record<string, string> | null)?.twilioNumber
  if (!fromNumber) {
    throw new Error('Organization has no Twilio number configured')
  }

  if (params.body.length > 160) {
    console.warn(
      `SMS body length ${params.body.length} exceeds 160 chars — will be split`
    )
  }

  const message = await client.messages.create({
    to: params.to,
    from: fromNumber,
    body: params.body,
  })

  return { messageSid: message.sid }
}
