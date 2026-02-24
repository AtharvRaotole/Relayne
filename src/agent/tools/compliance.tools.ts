import { prisma } from '../../lib/prisma'

export async function checkComplianceStatus(input: Record<string, unknown>): Promise<object> {
  const propertyId = input.propertyId as string

  const tasks = await prisma.complianceTask.findMany({
    where: { propertyId },
    include: { jurisdiction: true },
    orderBy: { dueDate: 'asc' },
  })

  const overdue = tasks.filter((t) => t.status === 'OVERDUE')
  const dueSoon = tasks.filter((t) => t.status === 'DUE_SOON' || t.status === 'AT_RISK')
  const upcoming = tasks.filter((t) => t.status === 'UPCOMING')

  return {
    propertyId,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    upcoming: upcoming.length,
    tasks,
  }
}

export async function generateLegalNotice(input: Record<string, unknown>): Promise<object> {
  const noticeType = input.noticeType as string
  const jurisdictionId = input.jurisdictionId as string
  const recipientName = input.recipientName as string | undefined
  const propertyAddress = input.propertyAddress as string | undefined

  const jurisdiction = await prisma.jurisdiction.findFirst({
    where: { id: jurisdictionId },
  })
  if (!jurisdiction) return { error: 'Jurisdiction not found' }

  // TODO: Use LLM to generate jurisdiction-specific notice
  const placeholder = `[LEGAL NOTICE - ${noticeType}]
Jurisdiction: ${jurisdiction.name}
Recipient: ${recipientName ?? '[Name]'}
Property: ${propertyAddress ?? '[Address]'}

This is a placeholder. Generate proper notice with AI in production.`
  return { noticeLanguage: placeholder, noticeType, jurisdictionId }
}

export async function logComplianceCompletion(input: Record<string, unknown>): Promise<object> {
  const complianceTaskId = input.complianceTaskId as string
  const completionNotes = input.completionNotes as string | undefined
  const documentUrl = input.documentUrl as string | undefined

  const task = await prisma.complianceTask.update({
    where: { id: complianceTaskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      noticeLanguage: completionNotes ?? undefined,
      documentUrl,
    },
  })
  return { success: true, taskId: task.id, status: 'COMPLETED' }
}
