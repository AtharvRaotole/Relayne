import { PrismaClient, Priority, WorkOrderCategory, WorkOrderStatus, ComplianceStatus, ComplianceTaskType, EscalationReason, EscalationStatus, AgentStatus } from '@prisma/client'
import { hashPassword } from '../src/shared/utils/password'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  // 1. Demo org
  const org = await prisma.organization.upsert({
    where: { slug: 'pinnacle-residential' },
    update: {},
    create: {
      name: 'Pinnacle Residential',
      slug: 'pinnacle-residential',
      plan: 'GROWTH',
      unitCount: 2400,
      settings: {
        poApprovalThreshold: 500,
      } as object,
    },
  })

  // 2. Demo login user
  const passwordHash = await hashPassword('Demo2024!')
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@pinnacle.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'demo@pinnacle.com',
      passwordHash,
      firstName: 'Dana',
      lastName: 'Harper',
      role: 'OWNER',
    },
  })

  // 3. Properties
  const properties: Awaited<ReturnType<typeof prisma.property.create>>[] = []
  async function findOrCreateProperty(name: string, address: object, unitCount: number) {
    let prop = await prisma.property.findFirst({
      where: { organizationId: org.id, name },
    })
    if (!prop) {
      prop = await prisma.property.create({
        data: {
          organizationId: org.id,
          name,
          address: address as object,
          propertyType: 'MULTIFAMILY',
          unitCount,
        },
      })
    }
    properties.push(prop)
  }

  await findOrCreateProperty(
    'The Elm at South Congress',
    {
      street: '2200 S Congress Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      country: 'US',
    },
    120
  )
  await findOrCreateProperty(
    'Midtown Commons',
    {
      street: '400 W 15th St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'US',
    },
    85
  )
  await findOrCreateProperty(
    'Riverside Flats',
    {
      street: '1800 Riverside Dr',
      city: 'Austin',
      state: 'TX',
      zip: '78741',
      country: 'US',
    },
    64
  )

  // 4. Tenants
  const tenantSpecs = [
    { firstName: 'Marcus', lastName: 'Lee', email: 'marcus.lee@example.com', churnRiskScore: 0.89, highRisk: true },
    { firstName: 'Jasmine', lastName: 'Ortiz', email: 'jasmine.ortiz@example.com', churnRiskScore: 0.75, highRisk: true },
    { firstName: 'Kevin', lastName: 'Price', email: 'kevin.price@example.com', churnRiskScore: 0.72, highRisk: true },
    { firstName: 'Aisha', lastName: 'Khan', email: 'aisha.khan@example.com', churnRiskScore: 0.62, highRisk: false },
    { firstName: 'Noah', lastName: 'Chen', email: 'noah.chen@example.com', churnRiskScore: 0.58, highRisk: false },
    { firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@example.com', churnRiskScore: 0.55, highRisk: false },
    { firstName: 'Alex', lastName: 'Garcia', email: 'alex.garcia@example.com', churnRiskScore: 0.48, highRisk: false },
    { firstName: 'Taylor', lastName: 'Brooks', email: 'taylor.brooks@example.com', churnRiskScore: 0.44, highRisk: false },
    { firstName: 'Emma', lastName: 'Davis', email: 'emma.davis@example.com', churnRiskScore: 0.32, highRisk: false },
    { firstName: 'Liam', lastName: 'Nguyen', email: 'liam.nguyen@example.com', churnRiskScore: 0.28, highRisk: false },
    { firstName: 'Sophia', lastName: 'Reed', email: 'sophia.reed@example.com', churnRiskScore: 0.21, highRisk: false },
    { firstName: 'Henry', lastName: 'Foster', email: 'henry.foster@example.com', churnRiskScore: 0.18, highRisk: false },
  ]

  const tenants = []
  for (let idx = 0; idx < tenantSpecs.length; idx++) {
    const t = tenantSpecs[idx]
    let tenant = await prisma.tenant.findFirst({
      where: { organizationId: org.id, email: t.email },
    })
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: org.id,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          phone: `+15125551${(100 + idx).toString()}`,
          preferredChannel: 'EMAIL',
          churnRiskScore: t.churnRiskScore,
        },
      })
    }
    tenants.push(tenant)
  }

  // 5. Units & leases – attach first few tenants
  const [prop1, prop2, prop3] = properties
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { propertyId_unitNumber: { propertyId: prop1.id, unitNumber: '4B' } },
      update: {},
      create: {
        propertyId: prop1.id,
        unitNumber: '4B',
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 980,
        floor: 4,
        isOccupied: true,
      },
    }),
    prisma.unit.upsert({
      where: { propertyId_unitNumber: { propertyId: prop1.id, unitNumber: '5B' } },
      update: {},
      create: {
        propertyId: prop1.id,
        unitNumber: '5B',
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 995,
        floor: 5,
        isOccupied: true,
      },
    }),
    prisma.unit.upsert({
      where: { propertyId_unitNumber: { propertyId: prop2.id, unitNumber: '12A' } },
      update: {},
      create: {
        propertyId: prop2.id,
        unitNumber: '12A',
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 720,
        floor: 12,
        isOccupied: true,
      },
    }),
  ])

  // high‑risk tenant with lease ending in ~12 days
  const marcus = tenants[0]
  await prisma.lease.upsert({
    where: { id: `${marcus.id}-lease` },
    update: {},
    create: {
      id: `${marcus.id}-lease`,
      unitId: units[0].id,
      tenantId: marcus.id,
      startDate: addDays(new Date(), -353),
      endDate: addDays(new Date(), 12),
      rentAmount: 1950,
      status: 'ACTIVE',
    },
  })

  // simple leases for a few others
  for (let i = 1; i < 5; i++) {
    const t = tenants[i]
    await prisma.lease.upsert({
      where: { id: `${t.id}-lease` },
      update: {},
      create: {
        id: `${t.id}-lease`,
        unitId: units[i % units.length].id,
        tenantId: t.id,
        startDate: addDays(new Date(), -200 - i * 5),
        endDate: addDays(new Date(), 90 + i * 3),
        rentAmount: 1750 + i * 50,
        status: 'ACTIVE',
      },
    })
  }

  // 6. Vendors
  const vendorData = [
    { companyName: 'Quick Fix Plumbing', trades: ['plumbing'], tier: 'PREFERRED' },
    { companyName: 'AirPro HVAC', trades: ['hvac'], tier: 'PREFERRED' },
    { companyName: 'BrightSpark Electrical', trades: ['electrical'], tier: 'STANDARD' },
    { companyName: 'Guardian Pest Control', trades: ['pest_control'], tier: 'STANDARD' },
    { companyName: 'Spotless Cleaning Co', trades: ['cleaning'], tier: 'STANDARD' },
    { companyName: 'GreenScape Landscaping', trades: ['landscaping'], tier: 'STANDARD' },
    { companyName: 'Peak Roofing', trades: ['roofing'], tier: 'PREFERRED' },
    { companyName: 'LiftSafe Elevator', trades: ['elevator'], tier: 'PREFERRED' },
  ]

  const vendors = []
  for (let idx = 0; idx < vendorData.length; idx++) {
    const v = vendorData[idx]
    let vendor = await prisma.vendor.findFirst({
      where: { organizationId: org.id, companyName: v.companyName },
    })
    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          organizationId: org.id,
          companyName: v.companyName,
          contactName: `${v.companyName.split(' ')[0]} Contact`,
          email: `${v.companyName.split(' ')[0].toLowerCase()}@example.com`,
          phone: `+15125552${(100 + idx).toString()}`,
          preferredChannel: 'EMAIL',
          trades: v.trades,
          serviceZips: ['78701', '78702', '78704', '78741'],
          avgResponseTimeHours: 3,
          avgCompletionDays: 3,
          avgRating: 4.5,
          completionRate: 0.96,
          totalJobsCompleted: 40 + idx,
          preferredTier: v.tier as any,
        },
      })
    }
    vendors.push(vendor)
  }

  // 7. Work orders (24 across statuses)
  const workOrders: { title: string; status: WorkOrderStatus; priority: Priority; category: WorkOrderCategory }[] =
    []

  // 3 emergencies (one with no vendor)
  workOrders.push(
    { title: 'No heat in unit 4B', status: WorkOrderStatus.NEW, priority: Priority.EMERGENCY, category: WorkOrderCategory.HVAC },
    { title: 'Active leak in ceiling', status: WorkOrderStatus.NEW, priority: Priority.EMERGENCY, category: WorkOrderCategory.PLUMBING },
    { title: 'Security gate stuck open', status: WorkOrderStatus.ESCALATED, priority: Priority.EMERGENCY, category: WorkOrderCategory.SECURITY },
  )

  // mix of IN_PROGRESS, COMPLETED, DISPATCHED, ESCALATED
  const extraTitles = [
    { title: 'HVAC not cooling properly', status: WorkOrderStatus.IN_PROGRESS, category: WorkOrderCategory.HVAC },
    { title: 'Garbage disposal jammed', status: WorkOrderStatus.IN_PROGRESS, category: WorkOrderCategory.PLUMBING },
    { title: 'Hallway lights flickering', status: WorkOrderStatus.DISPATCHED, category: WorkOrderCategory.ELECTRICAL },
    { title: 'Annual pest treatment', status: WorkOrderStatus.SCHEDULED, category: WorkOrderCategory.PEST_CONTROL },
    { title: 'Lobby deep cleaning', status: WorkOrderStatus.COMPLETED, category: WorkOrderCategory.CLEANING },
    { title: 'Roof leak repair', status: WorkOrderStatus.COMPLETED, category: WorkOrderCategory.ROOFING },
    { title: 'Elevator inspection', status: WorkOrderStatus.PENDING_REVIEW, category: WorkOrderCategory.ELEVATOR },
  ]
  for (const et of extraTitles) {
    workOrders.push({
      title: et.title,
      status: et.status,
      priority: Priority.NORMAL,
      category: et.category,
    })
  }
  while (workOrders.length < 24) {
    workOrders.push({
      title: `General maintenance ticket #${workOrders.length + 1}`,
      status: WorkOrderStatus.COMPLETED,
      priority: Priority.NORMAL,
      category: WorkOrderCategory.GENERAL_MAINTENANCE,
    })
  }

  const createdWorkOrders = []
  for (let i = 0; i < workOrders.length; i++) {
    const spec = workOrders[i]
    const property = properties[i % properties.length]
    const tenant = tenants[i % tenants.length]
    const vendor = i % 3 === 0 ? vendors[i % vendors.length] : null

    const wo = await prisma.workOrder.create({
      data: {
        organizationId: org.id,
        propertyId: property.id,
        unitId: units[i % units.length].id,
        tenantId: tenant.id,
        vendorId: vendor?.id ?? null,
        title: spec.title,
        description: spec.title,
        category: spec.category,
        priority: spec.priority,
        status: spec.status,
        estimatedCost: 250 + i * 10,
        actualCost: spec.status === WorkOrderStatus.COMPLETED ? 240 + i * 8 : null,
        aiHandled: i % 2 === 0,
      },
    })
    createdWorkOrders.push(wo)
  }

  // 8. Compliance tasks: 1 OVERDUE, 2 DUE_SOON, 3 UPCOMING
  await prisma.complianceTask.deleteMany({ where: { organizationId: org.id } })
  await prisma.complianceTask.createMany({
    data: [
      {
        id: 'overdue-elevator',
        organizationId: org.id,
        propertyId: prop1.id,
        jurisdictionId: null,
        taskType: ComplianceTaskType.ELEVATOR_INSPECTION,
        title: 'Annual elevator inspection',
        description: 'State-required annual elevator inspection.',
        dueDate: addDays(new Date(), -5),
        completedAt: null,
        status: ComplianceStatus.OVERDUE,
      },
      {
        id: 'at-risk-fire',
        organizationId: org.id,
        propertyId: prop2.id,
        jurisdictionId: null,
        taskType: ComplianceTaskType.FIRE_ALARM_TEST,
        title: 'Fire alarm system test',
        description: 'Quarterly fire alarm test.',
        dueDate: addDays(new Date(), 2),
        completedAt: null,
        status: ComplianceStatus.AT_RISK,
      },
      {
        id: 'at-risk-boiler',
        organizationId: org.id,
        propertyId: prop3.id,
        jurisdictionId: null,
        taskType: ComplianceTaskType.BOILER_INSPECTION,
        title: 'Boiler inspection',
        description: 'Boiler inspection before winter season.',
        dueDate: addDays(new Date(), 4),
        completedAt: null,
        status: ComplianceStatus.AT_RISK,
      },
      {
        id: 'upcoming-gas',
        organizationId: org.id,
        propertyId: prop1.id,
        jurisdictionId: null,
        taskType: ComplianceTaskType.GAS_LINE_INSPECTION,
        title: 'Gas line inspection',
        description: 'Routine gas line inspection.',
        dueDate: addDays(new Date(), 20),
        completedAt: null,
        status: ComplianceStatus.UPCOMING,
      },
      {
        id: 'upcoming-sprinkler',
        organizationId: org.id,
        propertyId: prop2.id,
        jurisdictionId: null,
        taskType: ComplianceTaskType.FIRE_SPRINKLER_TEST,
        title: 'Fire sprinkler test',
        description: 'Annual sprinkler test.',
        dueDate: addDays(new Date(), 25),
        completedAt: null,
        status: ComplianceStatus.UPCOMING,
      },
      {
        id: 'upcoming-mold',
        organizationId: org.id,
        propertyId: prop3.id,
        jurisdictionId: null,
        taskType: ComplianceTaskType.MOLD_INSPECTION,
        title: 'Mold inspection',
        description: 'Mold inspection in lower level units.',
        dueDate: addDays(new Date(), 28),
        completedAt: null,
        status: ComplianceStatus.UPCOMING,
      },
    ],
  })

  // 9. Invoice anomaly + escalations
  const anomalyVendor = vendors[0]
  const anomalyWo = createdWorkOrders[0]
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      vendorId: anomalyVendor.id,
      invoiceNumber: 'INV-1240',
      amount: 1240,
      taxAmount: 0,
      totalAmount: 1240,
      lineItems: [
        { description: 'Emergency leak response', qty: 1, rate: 400, amount: 400 },
        { description: 'Parts and materials', qty: 1, rate: 300, amount: 300 },
        { description: 'Labor (4 hours)', qty: 4, rate: 135, amount: 540 },
      ] as any,
      status: 'UNDER_REVIEW',
      aiReviewed: true,
      aiAnomalyFlag: true,
      aiAnomalyReason: 'Invoice ~3x higher than benchmark for similar plumbing jobs.',
      documentUrl: null,
    },
  })
  await prisma.workOrder.update({
    where: { id: anomalyWo.id },
    data: { invoiceId: invoice.id },
  })

  const escalations = await Promise.all([
    prisma.escalation.create({
      data: {
        organizationId: org.id,
        reason: EscalationReason.LEGAL_RISK,
        description: 'Potential Fair Housing concern detected in tenant message.',
        context: {},
        suggestedAction: 'Review message and respond with template-approved language.',
        status: EscalationStatus.OPEN,
        priority: Priority.HIGH,
      },
    }),
    prisma.escalation.create({
      data: {
        organizationId: org.id,
        reason: EscalationReason.HIGH_COST,
        description: 'Invoice $1,240 appears ~3x above benchmark for similar jobs.',
        context: { invoiceId: invoice.id },
        suggestedAction: 'Escalate to regional manager for approval or dispute.',
        status: EscalationStatus.OPEN,
        priority: Priority.HIGH,
      },
    }),
    prisma.escalation.create({
      data: {
        organizationId: org.id,
        reason: EscalationReason.EMERGENCY_UNRESOLVED,
        description: 'Emergency maintenance ticket has no vendor response after 3 hours.',
        context: {},
        suggestedAction: 'Dispatch backup vendor and notify tenant immediately.',
        status: EscalationStatus.OPEN,
        priority: Priority.EMERGENCY,
      },
    }),
  ])

  // 10. Agent logs (15+)
  const logsToCreate = 15
  for (let i = 0; i < logsToCreate; i++) {
    await prisma.agentLog.create({
      data: {
        organizationId: org.id,
        workflowType: i % 3 === 0 ? 'maintenance' : i % 3 === 1 ? 'compliance' : 'invoice_reconcile',
        triggerType: 'inbound_email',
        status: i % 5 === 0 ? AgentStatus.ESCALATED : AgentStatus.COMPLETED,
        steps: [],
        finalAction:
          i % 3 === 0
            ? 'Dispatched Quick Fix Plumbing to Unit 5B for HVAC repair'
            : i % 3 === 1
              ? 'Scheduled elevator inspection and logged compliance proof'
              : 'Flagged invoice as above benchmark and recommended review',
        workOrderId: createdWorkOrders[i % createdWorkOrders.length].id,
        escalationId: i % 5 === 0 ? escalations[i % escalations.length].id : null,
        tokensUsed: 1200 + i * 20,
        durationMs: 8000 + i * 500,
        completedAt: new Date(),
      },
    })
  }

  console.log('Seed completed.')
  console.log('Organization slug: pinnacle-residential')
  console.log('Demo login: demo@pinnacle.com / Demo2024!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
