import { prisma } from '../../lib/prisma'

/**
 * Resolve organization from inbound email recipient.
 * Format: <org-slug>@mail.propos.ai or similar
 */
export async function resolveOrganizationFromEmail(to: string) {
  const match = to.match(/^([^@+]+)(?:\+[^@]*)?@/)
  const localPart = match ? match[1].toLowerCase().trim() : ''
  if (!localPart) return null

  return prisma.organization.findFirst({
    where: { slug: localPart },
  })
}
