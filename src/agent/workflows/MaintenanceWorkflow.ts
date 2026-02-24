import { AgentRunner, type AgentInput } from '../core/AgentRunner'
import { prisma } from '../../lib/prisma'

export async function runMaintenanceWorkflow(params: {
  organizationId: string
  messageId: string
  tenantId?: string
  unitId?: string
  propertyId?: string
}) {
  const tenant = params.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: params.tenantId },
        include: { leases: { where: { status: 'ACTIVE' }, take: 1, include: { unit: true } } },
      })
    : null

  const activeLease = tenant?.leases?.[0]
  const unitId = params.unitId ?? activeLease?.unitId
  const unit = unitId
    ? await prisma.unit.findUnique({
        where: { id: unitId },
        include: { property: true },
      })
    : null

  const recentWorkOrders = unitId
    ? await prisma.workOrder.findMany({
        where: {
          unitId,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : []

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
  })

  const agentInput: AgentInput = {
    organizationId: params.organizationId,
    triggerType: 'inbound_email',
    triggerId: params.messageId,
    workflowHint: 'maintenance',
    context: {
      inboundMessage: message,
      tenant,
      unit,
      property: unit?.property,
      recentWorkOrders,
    },
  }

  const runner = new AgentRunner(params.organizationId)
  return runner.run(agentInput)
}
