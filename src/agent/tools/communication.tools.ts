import { prisma } from '../../lib/prisma'
import { sendEmail } from '../../integrations/email/sendgrid/sender'
import { sendSms } from '../../integrations/sms/twilio/sender'

export async function sendTenantMessage(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const tenantId = input.tenantId as string
  const message = input.message as string
  const subject = input.subject as string | undefined
  const channel = input.channel as string | undefined
  const workOrderId = input.workOrderId as string | undefined

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
  })
  if (!tenant) return { error: 'Tenant not found' }

  const targetChannel = channel ?? tenant.preferredChannel
  const to = targetChannel === 'SMS' ? tenant.phone : tenant.email

  if (!to) return { error: 'Tenant has no email or phone configured' }

  try {
    if (targetChannel === 'SMS') {
      const { messageSid } = await sendSms({
        to,
        body: message,
        organizationId,
      })
      return { success: true, channel: 'SMS', messageSid }
    }

    const { messageId } = await sendEmail({
      to,
      toName: `${tenant.firstName} ${tenant.lastName}`,
      subject: subject ?? 'Message from your property manager',
      text: message,
      organizationId,
    })
    return { success: true, channel: 'EMAIL', messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Failed to send: ${msg}` }
  }
}

export async function sendVendorMessage(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const vendorId = input.vendorId as string
  const message = input.message as string
  const subject = input.subject as string | undefined

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId },
  })
  if (!vendor) return { error: 'Vendor not found' }

  const to = vendor.preferredChannel === 'SMS' ? vendor.phone : vendor.email
  if (!to) return { error: 'Vendor has no contact info' }

  try {
    if (vendor.preferredChannel === 'SMS') {
      const { messageSid } = await sendSms({
        to,
        body: message,
        organizationId,
      })
      return { success: true, channel: 'SMS', messageSid }
    }

    const { messageId } = await sendEmail({
      to,
      toName: vendor.contactName ?? vendor.companyName,
      subject: subject ?? 'Job update',
      text: message,
      organizationId,
    })
    return { success: true, channel: 'EMAIL', messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Failed to send: ${msg}` }
  }
}

export async function getTenantHistory(input: Record<string, unknown>): Promise<object> {
  const tenantId = input.tenantId as string
  const limit = Math.min(50, (input.limit as number) ?? 20)

  const [messages, workOrders] = await Promise.all([
    prisma.message.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { thread: true },
    }),
    prisma.workOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { property: true, unit: true },
    }),
  ])

  return {
    messages: messages.length,
    workOrders: workOrders.length,
    recentMessages: messages,
    recentWorkOrders: workOrders,
  }
}
