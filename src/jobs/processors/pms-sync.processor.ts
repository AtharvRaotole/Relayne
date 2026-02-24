import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { getPmsClient } from '../../integrations/pms/factory'
import { logger } from '../../lib/logger'

export async function processPmsSync(job: Job) {
  const { organizationId } = job.data as { organizationId?: string; syncType?: string }

  if (!organizationId) {
    const orgs = await prisma.organization.findMany({ select: { id: true } })
    for (const org of orgs) {
      await syncOrganization(org.id)
    }
    return
  }

  await syncOrganization(organizationId)
}

async function syncOrganization(organizationId: string) {
  const pmsClient = await getPmsClient(organizationId)
  if (!pmsClient) {
    logger.warn({ organizationId }, 'No PMS connection found for sync')
    return
  }

  const data = await (pmsClient as { syncAll: (id: string) => Promise<{
    properties: Array<{ id: string; name: string; address?: object; unit_count?: number }>
    tenants: Array<{
      id: string
      first_name: string
      last_name: string
      email?: string
      phone?: string
    }>
  }> }).syncAll(organizationId)

  for (const property of data.properties ?? []) {
    await prisma.property.upsert({
      where: {
        organizationId_pmsPropertyId: {
          organizationId,
          pmsPropertyId: property.id,
        },
      },
      create: {
        organizationId,
        pmsPropertyId: property.id,
        name: property.name,
        address: (property.address ?? {}) as object,
        unitCount: property.unit_count ?? 0,
      },
      update: {
        name: property.name,
        address: (property.address ?? {}) as object,
        unitCount: property.unit_count ?? 0,
      },
    })
  }

  for (const tenant of data.tenants ?? []) {
    await prisma.tenant.upsert({
      where: {
        organizationId_pmsTenantId: {
          organizationId,
          pmsTenantId: tenant.id,
        },
      },
      create: {
        organizationId,
        pmsTenantId: tenant.id,
        firstName: tenant.first_name,
        lastName: tenant.last_name,
        email: tenant.email,
        phone: tenant.phone,
      },
      update: {
        firstName: tenant.first_name,
        lastName: tenant.last_name,
        email: tenant.email,
        phone: tenant.phone,
      },
    })
  }

  await prisma.pmsConnection.updateMany({
    where: { organizationId },
    data: { lastSyncAt: new Date(), syncStatus: 'success' },
  })

  logger.info(
    {
      organizationId,
      propertiesCount: (data.properties ?? []).length,
      tenantsCount: (data.tenants ?? []).length,
    },
    'PMS sync completed'
  )
}
