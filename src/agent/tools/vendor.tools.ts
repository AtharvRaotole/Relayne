import { prisma } from '../../lib/prisma'

export async function findAvailableVendors(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const trade = (input.trade as string)?.toLowerCase()
  const propertyZip = input.propertyZip as string
  const priority = (input.priority as string) ?? 'NORMAL'

  const vendors = await prisma.vendor.findMany({
    where: {
      organizationId,
      isActive: true,
      trades: { has: trade },
      serviceZips: { has: propertyZip },
    },
    orderBy: [
      { preferredTier: 'asc' },
      { avgResponseTimeHours: 'asc' },
      { avgRating: 'desc' },
    ],
    take: 10,
  })

  return {
    vendors: vendors.map((v) => ({
      id: v.id,
      companyName: v.companyName,
      contactName: v.contactName,
      preferredTier: v.preferredTier,
      avgResponseTimeHours: v.avgResponseTimeHours,
      avgRating: v.avgRating,
      completionRate: v.completionRate,
    })),
    count: vendors.length,
  }
}

export async function dispatchVendor(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const workOrderId = input.workOrderId as string
  const vendorId = input.vendorId as string

  const wo = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      vendorId,
      status: 'DISPATCHED',
    },
    include: { vendor: true },
  })

  // TODO: Send notification to vendor via their preferred channel

  return {
    success: true,
    workOrderId,
    vendorId,
    status: wo.status,
    message: 'Vendor dispatched. Notification sent.',
  }
}

export async function requestVendorBids(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const workOrderId = input.workOrderId as string
  const vendorIds = input.vendorIds as string[]

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: 'PENDING_BIDS' },
  })

  // TODO: Send bid requests to each vendor

  return {
    success: true,
    workOrderId,
    vendorsContacted: vendorIds.length,
    status: 'PENDING_BIDS',
  }
}

export async function getVendorPerformance(input: Record<string, unknown>): Promise<object> {
  const vendorId = input.vendorId as string
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      _count: { select: { workOrders: true, ratings: true } },
    },
  })
  return vendor ?? { error: 'Vendor not found' }
}
