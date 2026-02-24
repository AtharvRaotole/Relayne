import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/shared/utils/password'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await hashPassword('password123')

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-property-co' },
    update: {},
    create: {
      name: 'Demo Property Co',
      slug: 'demo-property-co',
      plan: 'GROWTH',
      unitCount: 500,
      settings: {
        poApprovalThreshold: 500,
        twilioNumber: '+15551234567',
      } as object,
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'OWNER',
    },
  })

  let property = await prisma.property.findFirst({
    where: { organizationId: org.id, name: 'Elm Street Apartments' },
  })
  if (!property) {
    property = await prisma.property.create({
      data: {
        organizationId: org.id,
        name: 'Elm Street Apartments',
        address: {
          street: '100 Elm Street',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          country: 'US',
        } as object,
        propertyType: 'MULTIFAMILY',
        unitCount: 50,
        yearBuilt: 2005,
      },
    })
  }

  let unit = await prisma.unit.findFirst({
    where: { propertyId: property.id, unitNumber: '101' },
  })
  if (!unit) {
    unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: '101',
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 950,
        floor: 1,
        isOccupied: true,
      },
    })
  }

  let tenant = await prisma.tenant.findFirst({
    where: { organizationId: org.id, email: 'jane.doe@example.com' },
  })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        organizationId: org.id,
        pmsTenantId: 'pms-tenant-demo-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+15125551111',
        preferredChannel: 'EMAIL',
      },
    })
  }

  let lease = await prisma.lease.findFirst({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
  })
  if (!lease) {
    lease = await prisma.lease.create({
      data: {
        unitId: unit.id,
        tenantId: tenant.id,
        startDate: addDays(new Date(), -300),
        endDate: addDays(new Date(), 65),
        rentAmount: 1850,
        securityDeposit: 1850,
        status: 'ACTIVE',
      },
    })
  }

  const vendorCount = await prisma.vendor.count({
    where: { organizationId: org.id },
  })
  if (vendorCount === 0) {
    await prisma.vendor.createMany({
      data: [
        {
          organizationId: org.id,
          companyName: 'Quick Fix Plumbing',
          contactName: 'Mike Johnson',
          email: 'mike@quickfixplumbing.com',
          phone: '+15125551234',
          trades: ['plumbing'],
          serviceZips: ['78701', '78702', '78703'],
          avgResponseTimeHours: 2.5,
          avgRating: 4.7,
          completionRate: 0.97,
          totalJobsCompleted: 45,
          preferredTier: 'PREFERRED',
          preferredChannel: 'EMAIL',
          laborRates: { hourly: 85, callout: 150 } as object,
        },
        {
          organizationId: org.id,
          companyName: 'AirPro HVAC Services',
          contactName: 'Lisa Chen',
          email: 'lisa@airprohvac.com',
          phone: '+15125559999',
          trades: ['hvac'],
          serviceZips: ['78701', '78702'],
          avgResponseTimeHours: 4,
          avgRating: 4.5,
          completionRate: 0.95,
          totalJobsCompleted: 32,
          preferredTier: 'PREFERRED',
          preferredChannel: 'SMS',
        },
      ],
    })
  }

  const threadCount = await prisma.thread.count({
    where: { organizationId: org.id, tenantId: tenant.id },
  })
  if (threadCount === 0) {
    const thread = await prisma.thread.create({
      data: {
        organizationId: org.id,
        tenantId: tenant.id,
        subject: 'Maintenance - Leaking faucet',
        status: 'OPEN',
      },
    })
    await prisma.message.create({
      data: {
        threadId: thread.id,
        tenantId: tenant.id,
        direction: 'INBOUND',
        channel: 'EMAIL',
        fromAddress: 'jane.doe@example.com',
        body: 'Hi, the kitchen faucet in unit 101 has been dripping for a few days. Could someone take a look? Thanks!',
        subject: 'Maintenance request - Leaking faucet',
      },
    })
  }

  console.log('Seed completed:', {
    org: org.name,
    property: property.name,
    tenant: tenant.email,
    unit: unit.unitNumber,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
