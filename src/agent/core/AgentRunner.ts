import OpenAI from 'openai'
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
  private client: OpenAI
  private organizationId: string
  private toolRegistry: ToolRegistry
  private escalationEngine: EscalationEngine
  private maxIterations = 15

  constructor(organizationId: string) {
    this.organizationId = organizationId
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
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
      const tools = this.toolRegistry.getTools()
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: buildSystemPrompt(context),
        },
        {
          role: 'user',
          content: this.buildUserMessage(input, context),
        },
      ]
      let iteration = 0

      while (iteration < this.maxIterations) {
        iteration++

        const response = await this.client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 4096,
          messages,
          tools: tools.map((t) => ({
            type: 'function' as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.input_schema,
            },
          })),
          tool_choice: 'auto',
        })

        totalTokens +=
          (response.usage?.prompt_tokens ?? 0) +
          (response.usage?.completion_tokens ?? 0)

        const choice = response.choices[0]
        const toolCalls = choice.message.tool_calls ?? []
        const reasoning = choice.message.content ?? ''
        const stopReason = choice.finish_reason

        if (toolCalls.length === 0 || stopReason === 'stop') {
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

        const toolResults: OpenAI.ChatCompletionMessageParam[] = []
        const stepToolCalls: unknown[] = []

        for (const toolCall of toolCalls) {
          if (toolCall.type !== 'function') continue

          const args = JSON.parse(toolCall.function.arguments || '{}') as Record<
            string,
            unknown
          >

          const escalationCheck = await this.escalationEngine.checkToolCall(
            toolCall.function.name,
            args,
            context as Record<string, unknown>
          )

          if (escalationCheck.shouldEscalate && escalationCheck.reason && escalationCheck.description) {
            const escalation = await this.escalationEngine.createEscalation({
              agentLogId: agentLog.id,
              reason: escalationCheck.reason,
              description: escalationCheck.description,
              context: { ...context, pendingToolCall: toolCall },
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
              toolCall.function.name,
              args
            )
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            toolResult = { error: msg }
            logger.error({ toolName: toolCall.function.name, error: msg }, 'Tool execution failed')
          }

          stepToolCalls.push({
            tool: toolCall.function.name,
            input: args,
            output: toolResult,
          })
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          })
        }

        steps.push({
          iteration,
          reasoning,
          toolCalls: stepToolCalls,
        })

        messages.push(choice.message as OpenAI.ChatCompletionMessageParam)
        messages.push(...toolResults)
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
