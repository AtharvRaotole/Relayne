import { prisma } from '../../lib/prisma'
import type { WorkOrderCategory, WorkOrderStatus, Priority } from '@prisma/client'

const WORK_ORDER_CATEGORIES: WorkOrderCategory[] = [
  'PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL',
  'PEST_CONTROL', 'LANDSCAPING', 'CLEANING', 'PAINTING', 'FLOORING',
  'ROOFING', 'SECURITY', 'ELEVATOR', 'FIRE_SAFETY', 'GENERAL_MAINTENANCE', 'EMERGENCY', 'OTHER',
]
const PRIORITIES: Priority[] = ['EMERGENCY', 'HIGH', 'NORMAL', 'LOW']
const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'NEW', 'TRIAGED', 'VENDOR_SEARCH', 'PENDING_BIDS', 'DISPATCHED',
  'SCHEDULED', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED',
  'CANCELLED', 'ESCALATED', 'ON_HOLD',
]

function asCategory(s: unknown): WorkOrderCategory {
  const val = String(s ?? '').toUpperCase()
  return WORK_ORDER_CATEGORIES.includes(val as WorkOrderCategory) ? (val as WorkOrderCategory) : 'GENERAL_MAINTENANCE'
}
function asPriority(s: unknown): Priority {
  const val = String(s ?? '').toUpperCase()
  return PRIORITIES.includes(val as Priority) ? (val as Priority) : 'NORMAL'
}
function asStatus(s: unknown): WorkOrderStatus {
  const val = String(s ?? '').toUpperCase()
  return WORK_ORDER_STATUSES.includes(val as WorkOrderStatus) ? (val as WorkOrderStatus) : 'NEW'
}

export async function createWorkOrder(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const wo = await prisma.workOrder.create({
    data: {
      organizationId,
      propertyId: input.propertyId as string,
      unitId: (input.unitId as string) ?? undefined,
      tenantId: (input.tenantId as string) ?? undefined,
      title: input.title as string,
      description: input.description as string,
      category: asCategory(input.category),
      priority: asPriority(input.priority),
      accessInstructions: input.accessInstructions as string | undefined,
    },
  })
  return { workOrderId: wo.id, status: wo.status }
}

export async function updateWorkOrderStatus(input: Record<string, unknown>): Promise<object> {
  const workOrderId = input.workOrderId as string
  const wo = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: asStatus(input.status) },
  })
  return { workOrderId: wo.id, status: wo.status }
}

export async function getWorkOrder(input: Record<string, unknown>): Promise<object> {
  const workOrderId = input.workOrderId as string
  const wo = await prisma.workOrder.findFirst({
    where: { id: workOrderId },
    include: {
      property: true,
      unit: true,
      tenant: true,
      vendor: true,
      timeline: { orderBy: { createdAt: 'asc' } },
    },
  })
  return wo ?? { error: 'Work order not found' }
}

export async function getOpenWorkOrdersForUnit(
  organizationId: string,
  input: Record<string, unknown>
): Promise<object> {
  const unitId = input.unitId as string
  const category = input.category as string | undefined
  const openStatuses = [
    'NEW',
    'TRIAGED',
    'VENDOR_SEARCH',
    'PENDING_BIDS',
    'DISPATCHED',
    'SCHEDULED',
    'IN_PROGRESS',
    'PENDING_REVIEW',
    'ESCALATED',
    'ON_HOLD',
  ]
  const where: Record<string, unknown> = {
    organizationId,
    unitId,
    status: { in: openStatuses },
  }
  if (category) where.category = asCategory(category)
  const orders = await prisma.workOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return { workOrders: orders, count: orders.length }
}
