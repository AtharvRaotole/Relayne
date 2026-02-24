import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { ToolRegistry } from './ToolRegistry'
import { EscalationEngine } from './EscalationEngine'
import { buildSystemPrompt } from '../prompts/system.prompt'
import { logger } from '../../lib/logger'
import { env } from '../../config/env'

export interface AgentInput {
  organizationId: string
  triggerType:
    | 'inbound_email'
    | 'inbound_sms'
    | 'portal_message'
    | 'scheduled'
    | 'webhook'
    | 'manual'
  triggerId?: string
  workflowHint?: string
  context?: Record<string, unknown>
}

export interface AgentResult {
  agentLogId: string
  status: 'completed' | 'escalated' | 'failed'
  finalAction?: string
  escalationId?: string
  workOrderId?: string
}

export class AgentRunner {
  private client: Anthropic
  private organizationId: string
  private toolRegistry: ToolRegistry
  private escalationEngine: EscalationEngine
  private maxIterations = 15

  constructor(organizationId: string) {
    this.organizationId = organizationId
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    this.toolRegistry = new ToolRegistry(organizationId)
    this.escalationEngine = new EscalationEngine(organizationId)
  }

  async run(input: AgentInput): Promise<AgentResult> {
    const agentLog = await prisma.agentLog.create({
      data: {
        organizationId: input.organizationId,
        workflowType: input.workflowHint ?? 'unknown',
        triggerType: input.triggerType,
        triggerId: input.triggerId,
        status: 'RUNNING',
        steps: [],
      },
    })

    const steps: object[] = []
    let totalTokens = 0

    try {
      const context = await this.buildContext(input)
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: this.buildUserMessage(input, context),
        },
      ]

      const tools = this.toolRegistry.getTools()
      let iteration = 0

      while (iteration < this.maxIterations) {
        iteration++

        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: buildSystemPrompt(context),
          tools,
          messages,
        })

        totalTokens += response.usage.input_tokens + response.usage.output_tokens

        const textBlocks = response.content.filter((b) => b.type === 'text')
        const reasoning = textBlocks
          .map((b) => (b.type === 'text' ? b.text : ''))
          .join('\n')

        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

        if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
          steps.push({
            iteration,
            reasoning,
            toolCalls: [],
            finalTurn: true,
          })

          await prisma.agentLog.update({
            where: { id: agentLog.id },
            data: {
              status: 'COMPLETED',
              steps: steps as object,
              reasoning,
              finalAction: this.extractFinalAction(reasoning),
              tokensUsed: totalTokens,
              completedAt: new Date(),
            },
          })

          return {
            agentLogId: agentLog.id,
            status: 'completed',
            finalAction: reasoning,
            workOrderId: agentLog.workOrderId ?? undefined,
          }
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        const stepToolCalls: unknown[] = []

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type !== 'tool_use') continue

          const escalationCheck = await this.escalationEngine.checkToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            context as Record<string, unknown>
          )

          if (escalationCheck.shouldEscalate && escalationCheck.reason && escalationCheck.description) {
            const escalation = await this.escalationEngine.createEscalation({
              agentLogId: agentLog.id,
              reason: escalationCheck.reason,
              description: escalationCheck.description,
              context: { ...context, pendingToolCall: toolUse },
              suggestedAction: escalationCheck.suggestedAction,
            })

            await prisma.agentLog.update({
              where: { id: agentLog.id },
              data: {
                status: 'ESCALATED',
                steps: steps as object,
                escalationId: escalation.id,
                tokensUsed: totalTokens,
                completedAt: new Date(),
              },
            })

            return {
              agentLogId: agentLog.id,
              status: 'escalated',
              escalationId: escalation.id,
            }
          }

          let toolResult: unknown
          try {
            toolResult = await this.toolRegistry.execute(
              toolUse.name,
              toolUse.input as Record<string, unknown>
            )
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            toolResult = { error: msg }
            logger.error({ toolName: toolUse.name, error: msg }, 'Tool execution failed')
          }

          stepToolCalls.push({
            tool: toolUse.name,
            input: toolUse.input,
            output: toolResult,
          })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          })
        }

        steps.push({
          iteration,
          reasoning,
          toolCalls: stepToolCalls,
        })

        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
      }

      const escalation = await this.escalationEngine.createEscalation({
        agentLogId: agentLog.id,
        reason: 'AI_LOW_CONFIDENCE',
        description: 'Agent reached maximum iterations without completing the task',
        context: context as Record<string, unknown>,
        suggestedAction: 'Review the work order and manually coordinate',
      })

      await prisma.agentLog.update({
        where: { id: agentLog.id },
        data: {
          status: 'ESCALATED',
          steps: steps as object,
          escalationId: escalation.id,
          tokensUsed: totalTokens,
          completedAt: new Date(),
        },
      })

      return {
        agentLogId: agentLog.id,
        status: 'escalated',
        escalationId: escalation.id,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      logger.error({ agentLogId: agentLog.id, error: msg }, 'Agent run failed')
      await prisma.agentLog.update({
        where: { id: agentLog.id },
        data: {
          status: 'FAILED',
          steps: steps as object,
          error: msg,
          completedAt: new Date(),
        },
      })
      return {
        agentLogId: agentLog.id,
        status: 'failed',
      }
    }
  }

  private async buildContext(input: AgentInput): Promise<Record<string, unknown>> {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      include: { pmsConnections: true },
    })

    return {
      organization: org,
      organizationId: input.organizationId,
      triggerType: input.triggerType,
      triggerId: input.triggerId,
      timestamp: new Date().toISOString(),
      ...input.context,
    }
  }

  private buildUserMessage(
    input: AgentInput,
    context: Record<string, unknown>
  ): string {
    const inboundMessage = context.inboundMessage as Record<string, unknown> | undefined
    const workOrder = context.workOrder as Record<string, unknown> | undefined
    const tenant = context.tenant as Record<string, unknown> | undefined

    return `You have a new task to handle.

Trigger: ${input.triggerType}
Organization: ${(context.organization as { name?: string })?.name ?? 'Unknown'}
Timestamp: ${context.timestamp}

${inboundMessage ? `Inbound message:\n${JSON.stringify(inboundMessage, null, 2)}` : ''}
${workOrder ? `Related work order:\n${JSON.stringify(workOrder, null, 2)}` : ''}
${tenant ? `Tenant:\n${JSON.stringify(tenant, null, 2)}` : ''}

Please handle this according to your instructions. Use the available tools to take action.`
  }

  private extractFinalAction(reasoning: string): string {
    const lines = reasoning.split('\n').filter((l) => l.trim())
    return lines[lines.length - 1] ?? reasoning.slice(0, 200)
  }
}
