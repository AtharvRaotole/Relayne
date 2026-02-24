import { prisma } from '../../lib/prisma'
import type { EscalationReason } from '@prisma/client'
import { env } from '../../config/env'

interface EscalationCheck {
  shouldEscalate: boolean
  reason?: EscalationReason
  description?: string
  suggestedAction?: string
}

export class EscalationEngine {
  private organizationId: string
  private poApprovalThreshold: number
  private emergencyResponseSlaHours: number

  constructor(organizationId: string) {
    this.organizationId = organizationId
    this.poApprovalThreshold = env.DEFAULT_PO_APPROVAL_THRESHOLD
    this.emergencyResponseSlaHours = env.DEFAULT_EMERGENCY_SLA_HOURS
  }

  async checkToolCall(
    toolName: string,
    input: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<EscalationCheck> {
    const cost = input.estimatedCost as number | undefined
    if (toolName === 'dispatch_vendor' && cost != null && cost > this.poApprovalThreshold) {
      return {
        shouldEscalate: true,
        reason: 'HIGH_COST',
        description: `Proposed dispatch has estimated cost $${cost}, which exceeds the auto-approval threshold of $${this.poApprovalThreshold}`,
        suggestedAction: 'Review the scope and approve or adjust the budget before dispatching vendor',
      }
    }

    if (toolName === 'generate_legal_notice') {
      const noticeType = input.noticeType as string
      const legalNoticeTypes = ['EVICTION_NOTICE', 'LEASE_TERMINATION', 'CURE_OR_QUIT']
      if (noticeType && legalNoticeTypes.includes(noticeType)) {
        return {
          shouldEscalate: true,
          reason: 'LEGAL_RISK',
          description: `Attempted to generate ${noticeType}. This requires human review before sending.`,
          suggestedAction: 'Review the notice, confirm with legal counsel if needed, then approve sending',
        }
      }
    }

    const messageAnalysis = context.messageAnalysis as { hostileScore?: number } | undefined
    if (
      toolName === 'send_tenant_message' &&
      messageAnalysis?.hostileScore != null &&
      messageAnalysis.hostileScore > 0.7
    ) {
      return {
        shouldEscalate: true,
        reason: 'HOSTILE_TENANT',
        description:
          'Tenant communication shows hostile language or potential legal threats. Human should manage this interaction.',
        suggestedAction: 'Review tenant communication history and respond personally or with legal guidance',
      }
    }

    if (toolName === 'escalate_to_human') {
      return {
        shouldEscalate: true,
        reason: (input.reason as EscalationReason) ?? 'AI_LOW_CONFIDENCE',
        description: (input.description as string) ?? 'Agent requested escalation',
        suggestedAction: input.suggestedAction as string | undefined,
      }
    }

    return { shouldEscalate: false }
  }

  async checkEmergencyTimeout(workOrderId: string): Promise<boolean> {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId: this.organizationId },
    })
    if (!wo || wo.priority !== 'EMERGENCY') return false
    const hoursSinceCreation = (Date.now() - wo.createdAt.getTime()) / (1000 * 3600)
    return hoursSinceCreation > this.emergencyResponseSlaHours && wo.status === 'VENDOR_SEARCH'
  }

  async createEscalation(params: {
    agentLogId: string
    reason: EscalationReason
    description: string
    context: Record<string, unknown>
    suggestedAction?: string
    priority?: string
    workOrderId?: string
  }) {
    const escalation = await prisma.escalation.create({
      data: {
        organizationId: this.organizationId,
        agentLogId: params.agentLogId,
        workOrderId: params.workOrderId,
        reason: params.reason,
        description: params.description,
        context: params.context as object,
        suggestedAction: params.suggestedAction,
        priority: (params.priority as 'EMERGENCY' | 'HIGH' | 'NORMAL' | 'LOW') ?? 'NORMAL',
        status: 'OPEN',
      },
    })

    await this.notifyCoordinator(escalation)
    return escalation
  }

  private async notifyCoordinator(escalation: { id: string }) {
    await prisma.user.findMany({
      where: {
        organizationId: this.organizationId,
        role: { in: ['ADMIN', 'COORDINATOR', 'OWNER'] },
        isActive: true,
      },
    })
    // TODO: Enqueue notification job
  }
}
