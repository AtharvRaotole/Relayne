import { getPmsClient } from '../../integrations/pms/factory'
import { prisma } from '../../lib/prisma'
import type { PmsClient } from '../../integrations/pms/factory'

function isAppFolio(client: PmsClient): client is import('../../integrations/pms/appfolio/client').AppFolioClient {
  return 'getTenantByEmail' in client
}

export async function getTenantFromPms(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const client = await getPmsClient(organizationId)
  if (!client) return { error: 'No PMS connection configured' }
  const email = input.email as string | undefined
  const pmsTenantId = input.pmsTenantId as string | undefined
  try {
    if (pmsTenantId && 'getTenant' in client) {
      const tenant = await (client as { getTenant(id: string): Promise<unknown> }).getTenant(pmsTenantId)
      return tenant ?? { error: 'Tenant not found in PMS' }
    }
    if (email && isAppFolio(client)) {
      const tenant = await client.getTenantByEmail(email)
      return tenant ?? { error: 'Tenant not found in PMS' }
    }
    return { error: 'Provide email or pmsTenantId' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `PMS fetch failed: ${msg}` }
  }
}

export async function syncWorkOrderToPms(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const client = await getPmsClient(organizationId)
  if (!client) return { error: 'No PMS connection configured' }
  const workOrderId = input.workOrderId as string

  const wo = await prisma.workOrder.findFirst({
    where: { id: workOrderId, organizationId },
    include: { property: true, unit: true },
  })
  if (!wo) return { error: 'Work order not found' }

  if (!isAppFolio(client)) return { error: 'PMS sync only supported for AppFolio' }

  try {
    const pmsUnitId = wo.unit?.pmsUnitId ?? wo.property.pmsPropertyId
    if (!pmsUnitId) return { error: 'Property/unit not linked to PMS' }

    const data = {
      unit_id: pmsUnitId,
      subject: wo.title,
      description: wo.description ?? '',
      priority: (wo.priority === 'EMERGENCY' ? 'urgent' : wo.priority === 'HIGH' ? 'urgent' : 'normal') as
        | 'urgent'
        | 'normal'
        | 'low',
    }
    const mr = await client.createMaintenanceRequest(data)
    return { success: true, pmsMaintenanceId: mr.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `PMS sync failed: ${msg}` }
  }
}
