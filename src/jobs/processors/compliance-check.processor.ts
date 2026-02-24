import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { addDays } from 'date-fns'
import { logger } from '../../lib/logger'

/**
 * Compliance check processor — scans due/overdue tasks, updates status.
 * Phase 4: Status updates only. Phase 5: AgentRunner for at-risk tasks.
 */
export async function processComplianceCheck(job: Job) {
  const tasks = await prisma.complianceTask.findMany({
    where: {
      status: { in: ['UPCOMING', 'DUE_SOON', 'AT_RISK'] },
      dueDate: { lte: addDays(new Date(), 30) },
      completedAt: null,
    },
    include: { property: true, jurisdiction: true },
  })

  for (const task of tasks) {
    const daysUntilDue = Math.ceil(
      (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    let newStatus = task.status
    if (daysUntilDue < 0) newStatus = 'OVERDUE'
    else if (daysUntilDue <= 7) newStatus = 'AT_RISK'
    else if (daysUntilDue <= 30) newStatus = 'DUE_SOON'

    await prisma.complianceTask.update({
      where: { id: task.id },
      data: { status: newStatus },
    })

    if (newStatus === 'DUE_SOON') {
      const lastReminder = task.lastReminderAt
      const hoursSinceReminder = lastReminder
        ? (Date.now() - lastReminder.getTime()) / (1000 * 3600)
        : Infinity

      if (hoursSinceReminder > 24) {
        await prisma.complianceTask.update({
          where: { id: task.id },
          data: {
            remindersSent: { increment: 1 },
            lastReminderAt: new Date(),
          },
        })
      }
    }
  }

  logger.info({ taskCount: tasks.length }, 'Compliance check completed')
}
