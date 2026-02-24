import { AgentRunner, type AgentInput } from '../core/AgentRunner'
import { prisma } from '../../lib/prisma'

export async function runLeaseRenewalWorkflow(params: {
  organizationId: string
  messageId: string
  tenantId?: string
}) {
  const tenant = params.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: params.tenantId },
        include: {
          leases: {
            where: { status: 'ACTIVE' },
            orderBy: { endDate: 'desc' },
            take: 1,
            include: { unit: { include: { property: true } } },
          },
        },
      })
    : null

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
  })

  const agentInput: AgentInput = {
    organizationId: params.organizationId,
    triggerType: 'inbound_email',
    triggerId: params.messageId,
    workflowHint: 'lease_renewal',
    context: {
      inboundMessage: message,
      tenant,
      activeLease: tenant?.leases?.[0],
    },
  }

  const runner = new AgentRunner(params.organizationId)
  return runner.run(agentInput)
}
