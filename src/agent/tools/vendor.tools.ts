import { prisma } from '../../lib/prisma'
import { sendEmail } from '../../integrations/email/sendgrid/sender'
import { sendSms } from '../../integrations/sms/twilio/sender'
import { env } from '../../config/env'
import type { VendorTier } from '@prisma/client'

interface VendorForScore {
  avgResponseTimeHours: number | null
  avgRating: number | null
  completionRate: number | null
  totalJobsCompleted: number
  preferredTier: string
}

function calculateVendorScore(
  vendor: VendorForScore,
  context: { priority: string; estimatedBudget?: number }
): number {
  let score = 0
  const priority = String(context.priority ?? 'NORMAL').toUpperCase()

  if (priority === 'EMERGENCY') {
    if ((vendor.avgResponseTimeHours ?? 99) <= 1) score += 30
    else if ((vendor.avgResponseTimeHours ?? 99) <= 2) score += 25
    else if ((vendor.avgResponseTimeHours ?? 99) <= 4) score += 15
    else score += 5
  } else {
    if ((vendor.avgResponseTimeHours ?? 99) <= 4) score += 20
    else if ((vendor.avgResponseTimeHours ?? 99) <= 24) score += 15
    else score += 5
  }

  score += ((vendor.avgRating ?? 0) / 5) * 30
  score += (vendor.completionRate ?? 0) * 20
  if ((vendor.totalJobsCompleted ?? 0) >= 50) score += 10
  else if ((vendor.totalJobsCompleted ?? 0) >= 20) score += 7
  else if ((vendor.totalJobsCompleted ?? 0) >= 5) score += 4
  if (vendor.preferredTier === 'PREFERRED') score += 10

  return Math.min(100, score)
}

function buildScoreReasons(vendor: VendorForScore, _score: number): string[] {
  const reasons: string[] = []
  if ((vendor.avgResponseTimeHours ?? 99) <= 2) reasons.push(`Avg response ${vendor.avgResponseTimeHours}h`)
  if ((vendor.avgRating ?? 0) >= 4.5) reasons.push(`${(vendor.avgRating ?? 0).toFixed(1)}⭐ rating`)
  if ((vendor.completionRate ?? 0) >= 0.95) reasons.push(`${Math.round((vendor.completionRate ?? 0) * 100)}% completion rate`)
  if ((vendor.totalJobsCompleted ?? 0) >= 20) reasons.push(`${vendor.totalJobsCompleted} jobs completed`)
  return reasons
}

export async function findAvailableVendors(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const trade = String(input.trade ?? '').toLowerCase()
  const propertyZip = input.propertyZip as string
  const priority = String(input.priority ?? 'NORMAL').toUpperCase()
  const tierFilter: VendorTier[] =
    priority === 'EMERGENCY'
      ? ['PREFERRED', 'STANDARD']
      : priority === 'HIGH'
        ? ['PREFERRED', 'STANDARD']
        : ['PREFERRED', 'STANDARD', 'BACKUP']

  const vendors = await prisma.vendor.findMany({
    where: {
      organizationId,
      isActive: true,
      preferredTier: { in: tierFilter },
      trades: { has: trade },
      OR: [
        { serviceZips: { has: propertyZip } },
        { serviceZips: { isEmpty: true } },
      ],
    },
    include: { ratings: { orderBy: { createdAt: 'desc' }, take: 20 } },
    orderBy: [
      { preferredTier: 'asc' },
      { avgRating: 'desc' },
      { completionRate: 'desc' },
    ],
    take: 20,
  })

  const scoredVendors = vendors.map((v) => {
    const vForScore: VendorForScore = {
      avgResponseTimeHours: v.avgResponseTimeHours,
      avgRating: v.avgRating,
      completionRate: v.completionRate,
      totalJobsCompleted: v.totalJobsCompleted,
      preferredTier: v.preferredTier,
    }
    const score = calculateVendorScore(vForScore, { priority, estimatedBudget: input.estimatedBudget as number | undefined })
    return {
      vendorId: v.id,
      vendorName: v.companyName,
      score,
      tier: v.preferredTier,
      avgResponseTimeHours: v.avgResponseTimeHours,
      avgRating: v.avgRating,
      completionRate: v.completionRate,
      totalJobsCompleted: v.totalJobsCompleted,
      laborRates: v.laborRates,
      reasons: buildScoreReasons(vForScore, score),
    }
  })

  scoredVendors.sort((a, b) => b.score - a.score)

  return {
    vendors: scoredVendors.slice(0, 5),
    totalFound: scoredVendors.length,
  }
}

function generatePoNumber(organizationId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const orgCode = organizationId.slice(-4).toUpperCase()
  return `PO-${orgCode}-${timestamp}`
}

function buildVendorDispatchMessage(
  wo: { title: string; priority: string; description: string; accessInstructions: string | null; property: { name: string; address: unknown }; unit: { unitNumber: string } | null; tenant: { firstName: string; phone: string | null } | null },
  vendor: { companyName: string },
  input: Record<string, unknown>
): string {
  const priority = wo.priority === 'EMERGENCY' ? '🚨 EMERGENCY — SAME DAY RESPONSE REQUIRED\n\n' : ''
  const tenantContact = wo.tenant
    ? `Tenant Contact: ${wo.tenant.firstName} — ${wo.tenant.phone ?? 'No phone'}`
    : 'No direct tenant contact — call the office for access'
  const address = typeof wo.property.address === 'object' ? JSON.stringify(wo.property.address) : String(wo.property.address)

  return `${priority}New Work Order Assignment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Priority: ${wo.priority}
Property: ${wo.property.name}
Address: ${address}
Unit: ${wo.unit?.unitNumber ?? 'Common area'}

Issue: ${wo.title}
Details: ${wo.description}

Access Instructions: ${wo.accessInstructions ?? 'Standard key in lockbox — call for code'}
${tenantContact}

${(input.schedulingInstructions as string) ? `Scheduling Notes: ${input.schedulingInstructions}` : ''}
${(input.message as string) ? `\nAdditional Notes: ${input.message}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please confirm receipt and provide an ETA.
Track this job: ${env.VENDOR_PORTAL_URL}/jobs/${(wo as { id?: string }).id ?? ''}

Questions? Reply to this email or call the office.`
}

function buildTenantDispatchNotification(
  wo: { tenant: { firstName: string } | null; category: string; title: string; priority: string },
  vendor: { companyName: string }
): string {
  return `Hi ${wo.tenant?.firstName ?? 'there'},

We've scheduled ${vendor.companyName} to address your ${wo.category.toLowerCase().replace('_', ' ')} issue.

They'll be reaching out to confirm a time. If you don't hear from them within 24 hours, please let us know.

Issue: ${wo.title}
Priority: ${wo.priority === 'EMERGENCY' ? 'Emergency — same day' : wo.priority === 'HIGH' ? 'Within 24 hours' : 'Within 3 business days'}

Thank you for your patience.`
}

export async function dispatchVendor(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const workOrderId = input.workOrderId as string
  const vendorId = input.vendorId as string

  const [workOrder, vendor] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { property: true, unit: true, tenant: true },
    }),
    prisma.vendor.findUnique({ where: { id: vendorId } }),
  ])

  if (!workOrder || !vendor) return { error: 'Work order or vendor not found' }

  const poNumber = generatePoNumber(organizationId)

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      vendorId,
      status: 'DISPATCHED',
      poNumber,
    },
  })

  const woWithId = { ...workOrder, id: workOrderId }
  const dispatchMessage = buildVendorDispatchMessage(woWithId, vendor, input)

  if (vendor.preferredChannel === 'EMAIL' && vendor.email) {
    await sendEmail({
      to: vendor.email,
      toName: vendor.contactName ?? vendor.companyName,
      subject: `New Work Order: ${workOrder.title} — ${workOrder.property.name}`,
      text: dispatchMessage,
      organizationId,
    })
  } else if (vendor.preferredChannel === 'SMS' && vendor.phone) {
    const address = typeof workOrder.property.address === 'object'
      ? (workOrder.property.address as { street?: string; city?: string })?.street ?? JSON.stringify(workOrder.property.address)
      : String(workOrder.property.address)
    const smsBody = `New job: ${workOrder.title} at ${address}. Unit ${workOrder.unit?.unitNumber ?? 'N/A'}. ${workOrder.priority === 'EMERGENCY' ? '🚨 EMERGENCY' : ''} Reply CONFIRM or DECLINE. Details: ${env.VENDOR_PORTAL_URL}/jobs/${workOrderId}`
    await sendSms({ to: vendor.phone, body: smsBody, organizationId })
  }

  await prisma.workOrderEvent.create({
    data: {
      workOrderId,
      eventType: 'vendor_dispatched',
      description: `Dispatched to ${vendor.companyName}`,
      metadata: { vendorId, poNumber, channel: vendor.preferredChannel },
      actorType: 'ai',
    },
  })

  if (workOrder.tenant) {
    const tenantMsg = buildTenantDispatchNotification(workOrder, vendor)
    if (workOrder.tenant.preferredChannel === 'SMS' && workOrder.tenant.phone) {
      await sendSms({ to: workOrder.tenant.phone, body: tenantMsg, organizationId })
    } else if (workOrder.tenant.email) {
      await sendEmail({
        to: workOrder.tenant.email,
        toName: workOrder.tenant.firstName,
        subject: `Update: ${workOrder.title}`,
        text: tenantMsg,
        organizationId,
      })
    }
  }

  return {
    success: true,
    poNumber,
    vendorNotified: true,
    tenantNotified: !!workOrder.tenant,
    channel: vendor.preferredChannel,
  }
}

export async function requestVendorBids(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const workOrderId = input.workOrderId as string
  const vendorIds = (input.vendorIds as string[]) ?? []
  const scopeOfWork = (input.scopeOfWork as string) ?? ''
  const bidDeadlineHours = (input.bidDeadlineHours as number) ?? 48

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { property: true, unit: true },
  })
  if (!workOrder) return { error: 'Work order not found' }

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
  })

  const bidDeadline = new Date(Date.now() + bidDeadlineHours * 60 * 60 * 1000)
  const bids: { id: string }[] = []

  for (const vendor of vendors) {
    const bid = await prisma.vendorBid.create({
      data: {
        workOrderId,
        vendorId: vendor.id,
        amount: 0,
        validUntil: bidDeadline,
        status: 'PENDING',
        notes: 'Awaiting vendor bid submission',
      },
    })
    bids.push(bid)

    const bidRequestMessage = `Bid Request — ${workOrder.title}

Property: ${workOrder.property.name}
Unit: ${workOrder.unit?.unitNumber ?? 'Common area'}

Scope of Work:
${scopeOfWork}

Please submit your bid by: ${bidDeadline.toLocaleString()}
Submit here: ${env.VENDOR_PORTAL_URL}/bids/${bid.id}

Questions? Reply to this email.`

    if (vendor.email) {
      await sendEmail({
        to: vendor.email,
        toName: vendor.contactName ?? vendor.companyName,
        subject: `Bid Request: ${workOrder.title}`,
        text: bidRequestMessage,
        organizationId,
      })
    }
  }

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: 'PENDING_BIDS' },
  })

  return {
    success: true,
    bidsRequested: bids.length,
    deadline: bidDeadline.toISOString(),
    vendorsContacted: vendors.map((v) => v.companyName),
    status: 'PENDING_BIDS',
  }
}

export async function getVendorPerformance(input: Record<string, unknown>): Promise<object> {
  const vendorId = input.vendorId as string
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      ratings: { orderBy: { createdAt: 'desc' }, take: 10 },
      workOrders: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          category: true,
          completedAt: true,
          createdAt: true,
          scheduledAt: true,
          actualCost: true,
          estimatedCost: true,
        },
      },
    },
  })

  if (!vendor) return { error: 'Vendor not found' }

  const completedJobs = vendor.workOrders.filter((wo) => wo.completedAt && wo.scheduledAt)
  const avgDaysToComplete =
    completedJobs.length > 0
      ? completedJobs.reduce((sum, wo) => {
          const days = (wo.completedAt!.getTime() - wo.createdAt.getTime()) / 1000 / 60 / 60 / 24
          return sum + days
        }, 0) / completedJobs.length
      : null

  return {
    vendorId: vendor.id,
    name: vendor.companyName,
    tier: vendor.preferredTier,
    metrics: {
      avgRating: vendor.avgRating,
      completionRate: vendor.completionRate,
      avgResponseTimeHours: vendor.avgResponseTimeHours,
      avgDaysToComplete,
      totalJobsCompleted: vendor.totalJobsCompleted,
      insuranceExpiry: vendor.insuranceExpiry,
      licenseExpiry: vendor.licenseExpiry,
    },
    recentRatings: vendor.ratings,
    recentJobs: vendor.workOrders.slice(0, 5),
  }
}
