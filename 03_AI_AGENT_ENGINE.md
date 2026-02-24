# AI Agent Engine
## Core Intelligence Layer — Full Specification

> This is the heart of PropOS. The agent is not a chatbot. It is an autonomous coordinator that reads situations, decides what to do, executes multi-step workflows, and knows when to stop and ask a human.

---

## Architecture Overview

```
Inbound Event (email/SMS/webhook/cron)
         │
         ▼
    Job Queue (BullMQ)
         │
         ▼
  AgentRunner.run()
    │
    ├── 1. Load Context (tenant, property, work order history)
    ├── 2. Classify Intent
    ├── 3. Select Workflow
    ├── 4. Execute Tool Loop (Claude tool use)
    │       ├── tool_call → deterministic action
    │       ├── tool_call → deterministic action
    │       └── ... (up to 15 iterations)
    ├── 5. EscalationEngine.check() — should human review?
    └── 6. Log everything to AgentLog
```

---

## `src/agent/core/AgentRunner.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { ToolRegistry } from './ToolRegistry'
import { EscalationEngine } from './EscalationEngine'
import { buildSystemPrompt } from '../prompts/system.prompt'
import { logger } from '../../lib/logger'

export interface AgentInput {
  organizationId: string
  triggerType: 'inbound_email' | 'inbound_sms' | 'portal_message' | 'scheduled' | 'webhook' | 'manual'
  triggerId?: string
  workflowHint?: string  // Optional hint for which workflow to use
  context?: Record<string, any>  // Pre-loaded context to avoid duplicate DB calls
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
  private toolRegistry: ToolRegistry
  private escalationEngine: EscalationEngine
  private maxIterations = 15

  constructor(organizationId: string) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.toolRegistry = new ToolRegistry(organizationId)
    this.escalationEngine = new EscalationEngine(organizationId)
  }

  async run(input: AgentInput): Promise<AgentResult> {
    // Create agent log at start
    const agentLog = await prisma.agentLog.create({
      data: {
        organizationId: input.organizationId,
        workflowType: input.workflowHint || 'unknown',
        triggerType: input.triggerType,
        triggerId: input.triggerId,
        status: 'RUNNING',
        steps: [],
      }
    })

    const steps: any[] = []
    let totalTokens = 0

    try {
      // Build initial context
      const context = await this.buildContext(input)
      
      // Build conversation messages for Claude
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: this.buildUserMessage(input, context)
        }
      ]

      const tools = this.toolRegistry.getTools()
      let iteration = 0

      // Main agent loop
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

        // Collect text reasoning
        const textBlocks = response.content.filter(b => b.type === 'text')
        const reasoning = textBlocks.map(b => (b as any).text).join('\n')

        // Process tool calls
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
        
        if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
          // Agent is done
          const step = { iteration, reasoning, toolCalls: [], finalTurn: true }
          steps.push(step)
          
          await prisma.agentLog.update({
            where: { id: agentLog.id },
            data: {
              status: 'COMPLETED',
              steps,
              reasoning,
              finalAction: this.extractFinalAction(reasoning),
              tokensUsed: totalTokens,
              completedAt: new Date(),
            }
          })

          return { agentLogId: agentLog.id, status: 'completed', finalAction: reasoning }
        }

        // Execute each tool call
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        const stepToolCalls = []

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type !== 'tool_use') continue

          // Check for escalation before executing any tool
          const escalationCheck = await this.escalationEngine.checkToolCall(
            toolUse.name,
            toolUse.input as Record<string, any>,
            context
          )

          if (escalationCheck.shouldEscalate) {
            const escalation = await this.escalationEngine.createEscalation({
              agentLogId: agentLog.id,
              reason: escalationCheck.reason!,
              description: escalationCheck.description!,
              context: { ...context, pendingToolCall: toolUse },
              suggestedAction: escalationCheck.suggestedAction,
            })

            await prisma.agentLog.update({
              where: { id: agentLog.id },
              data: {
                status: 'ESCALATED',
                steps,
                escalationId: escalation.id,
                tokensUsed: totalTokens,
                completedAt: new Date(),
              }
            })

            return {
              agentLogId: agentLog.id,
              status: 'escalated',
              escalationId: escalation.id,
            }
          }

          // Execute tool
          let toolResult: any
          try {
            toolResult = await this.toolRegistry.execute(toolUse.name, toolUse.input as Record<string, any>)
          } catch (err: any) {
            toolResult = { error: err.message }
            logger.error({ toolName: toolUse.name, error: err.message }, 'Tool execution failed')
          }

          stepToolCalls.push({ tool: toolUse.name, input: toolUse.input, output: toolResult })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          })
        }

        steps.push({ iteration, reasoning, toolCalls: stepToolCalls })

        // Add assistant response + tool results to message history
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
      }

      // Hit max iterations — escalate
      const escalation = await this.escalationEngine.createEscalation({
        agentLogId: agentLog.id,
        reason: 'AI_LOW_CONFIDENCE',
        description: 'Agent reached maximum iterations without completing the task',
        context,
        suggestedAction: 'Review the work order and manually coordinate',
      })

      await prisma.agentLog.update({
        where: { id: agentLog.id },
        data: { status: 'ESCALATED', steps, escalationId: escalation.id, tokensUsed: totalTokens, completedAt: new Date() }
      })

      return { agentLogId: agentLog.id, status: 'escalated', escalationId: escalation.id }

    } catch (err: any) {
      logger.error({ agentLogId: agentLog.id, error: err.message }, 'Agent run failed')
      await prisma.agentLog.update({
        where: { id: agentLog.id },
        data: { status: 'FAILED', steps, error: err.message, completedAt: new Date() }
      })
      return { agentLogId: agentLog.id, status: 'failed' }
    }
  }

  private async buildContext(input: AgentInput): Promise<Record<string, any>> {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      include: { pmsConnections: true }
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

  private buildUserMessage(input: AgentInput, context: Record<string, any>): string {
    return `You have a new task to handle.

Trigger: ${input.triggerType}
Organization: ${context.organization?.name}
Timestamp: ${context.timestamp}

${context.inboundMessage ? `Inbound message:\n${JSON.stringify(context.inboundMessage, null, 2)}` : ''}
${context.workOrder ? `Related work order:\n${JSON.stringify(context.workOrder, null, 2)}` : ''}
${context.tenant ? `Tenant:\n${JSON.stringify(context.tenant, null, 2)}` : ''}

Please handle this according to your instructions. Use the available tools to take action.`
  }

  private extractFinalAction(reasoning: string): string {
    // Extract the last meaningful action statement from reasoning
    const lines = reasoning.split('\n').filter(l => l.trim())
    return lines[lines.length - 1] || reasoning.slice(0, 200)
  }
}
```

---

## `src/agent/core/ToolRegistry.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import * as WorkOrderTools from '../tools/workorder.tools'
import * as VendorTools from '../tools/vendor.tools'
import * as CommunicationTools from '../tools/communication.tools'
import * as ComplianceTools from '../tools/compliance.tools'
import * as PmsTools from '../tools/pms.tools'

export class ToolRegistry {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  getTools(): Anthropic.Tool[] {
    return [
      // ── WORK ORDER TOOLS ──────────────────────────────
      {
        name: 'create_work_order',
        description: 'Create a new maintenance work order from a tenant request or inspection finding',
        input_schema: {
          type: 'object' as const,
          properties: {
            propertyId: { type: 'string', description: 'Property ID' },
            unitId: { type: 'string', description: 'Unit ID if applicable' },
            tenantId: { type: 'string', description: 'Tenant ID if applicable' },
            title: { type: 'string', description: 'Brief title for the work order' },
            description: { type: 'string', description: 'Detailed description of the issue' },
            category: { type: 'string', description: 'Category: PLUMBING, ELECTRICAL, HVAC, APPLIANCE, STRUCTURAL, PEST_CONTROL, LANDSCAPING, GENERAL_MAINTENANCE, EMERGENCY, etc.' },
            priority: { type: 'string', description: 'EMERGENCY (< 4hrs), HIGH (< 24hrs), NORMAL (< 72hrs), LOW (< 7 days)' },
            accessInstructions: { type: 'string', description: 'How vendor should access the unit' },
          },
          required: ['propertyId', 'title', 'description', 'category'],
        }
      },
      {
        name: 'update_work_order_status',
        description: 'Update the status of an existing work order',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
            status: { type: 'string', description: 'New status' },
            notes: { type: 'string', description: 'Reason for status change' },
          },
          required: ['workOrderId', 'status'],
        }
      },
      {
        name: 'get_work_order',
        description: 'Get full details of a work order including history and tenant info',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
          },
          required: ['workOrderId'],
        }
      },
      {
        name: 'get_open_work_orders_for_unit',
        description: 'Check if a unit has existing open work orders (avoid duplicates)',
        input_schema: {
          type: 'object' as const,
          properties: {
            unitId: { type: 'string' },
            category: { type: 'string', description: 'Optional: filter by category' },
          },
          required: ['unitId'],
        }
      },
      // ── VENDOR TOOLS ──────────────────────────────────
      {
        name: 'find_available_vendors',
        description: 'Find vendors available for a job based on trade, location, and priority',
        input_schema: {
          type: 'object' as const,
          properties: {
            trade: { type: 'string', description: 'The trade needed (plumbing, hvac, electrical, etc.)' },
            propertyZip: { type: 'string', description: 'ZIP code of the property' },
            priority: { type: 'string', description: 'Job priority — affects which tier of vendors to contact' },
            estimatedBudget: { type: 'number', description: 'Estimated budget for the job' },
          },
          required: ['trade', 'propertyZip', 'priority'],
        }
      },
      {
        name: 'dispatch_vendor',
        description: 'Assign a vendor to a work order and send them the job details via their preferred channel',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
            vendorId: { type: 'string' },
            schedulingInstructions: { type: 'string', description: 'Any scheduling constraints or urgency info' },
            message: { type: 'string', description: 'Custom message to include in vendor notification' },
          },
          required: ['workOrderId', 'vendorId'],
        }
      },
      {
        name: 'request_vendor_bids',
        description: 'Send bid request to multiple vendors for a larger job (use when cost > approval threshold or job is complex)',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
            vendorIds: { type: 'array', items: { type: 'string' }, description: 'List of vendor IDs to request bids from' },
            bidDeadlineHours: { type: 'number', description: 'How many hours vendors have to submit bids' },
            scopeOfWork: { type: 'string', description: 'Detailed scope of work for bidding' },
          },
          required: ['workOrderId', 'vendorIds', 'scopeOfWork'],
        }
      },
      {
        name: 'get_vendor_performance',
        description: 'Get performance history for a vendor to inform dispatch decisions',
        input_schema: {
          type: 'object' as const,
          properties: {
            vendorId: { type: 'string' },
          },
          required: ['vendorId'],
        }
      },
      // ── COMMUNICATION TOOLS ───────────────────────────
      {
        name: 'send_tenant_message',
        description: 'Send a message to a tenant via their preferred channel (email or SMS)',
        input_schema: {
          type: 'object' as const,
          properties: {
            tenantId: { type: 'string' },
            message: { type: 'string', description: 'Message body' },
            subject: { type: 'string', description: 'Email subject (if sending via email)' },
            channel: { type: 'string', description: 'Override channel: EMAIL or SMS. Leave blank to use tenant preference.' },
            workOrderId: { type: 'string', description: 'Link message to a work order thread if applicable' },
          },
          required: ['tenantId', 'message'],
        }
      },
      {
        name: 'send_vendor_message',
        description: 'Send a message to a vendor (scheduling follow-up, additional details, etc.)',
        input_schema: {
          type: 'object' as const,
          properties: {
            vendorId: { type: 'string' },
            message: { type: 'string' },
            subject: { type: 'string' },
            workOrderId: { type: 'string' },
          },
          required: ['vendorId', 'message'],
        }
      },
      {
        name: 'get_tenant_history',
        description: 'Get recent communication history and work order history for a tenant to understand context',
        input_schema: {
          type: 'object' as const,
          properties: {
            tenantId: { type: 'string' },
            limit: { type: 'number', description: 'Max number of recent interactions to return (default 20)' },
          },
          required: ['tenantId'],
        }
      },
      // ── COMPLIANCE TOOLS ──────────────────────────────
      {
        name: 'check_compliance_status',
        description: 'Check compliance status for a property — upcoming deadlines, overdue items, at-risk items',
        input_schema: {
          type: 'object' as const,
          properties: {
            propertyId: { type: 'string' },
          },
          required: ['propertyId'],
        }
      },
      {
        name: 'generate_legal_notice',
        description: 'Generate legally correct notice language for a given notice type and jurisdiction',
        input_schema: {
          type: 'object' as const,
          properties: {
            noticeType: { type: 'string', description: 'Type: ENTRY_NOTICE, RENT_INCREASE, HABITABILITY, LEASE_RENEWAL, etc.' },
            jurisdictionId: { type: 'string' },
            recipientName: { type: 'string' },
            propertyAddress: { type: 'string' },
            additionalDetails: { type: 'object', description: 'Any specific details needed for this notice type' },
          },
          required: ['noticeType', 'jurisdictionId'],
        }
      },
      {
        name: 'log_compliance_completion',
        description: 'Mark a compliance task as completed and log the proof',
        input_schema: {
          type: 'object' as const,
          properties: {
            complianceTaskId: { type: 'string' },
            completionNotes: { type: 'string' },
            documentUrl: { type: 'string', description: 'S3 URL of proof document' },
          },
          required: ['complianceTaskId'],
        }
      },
      // ── PMS TOOLS ─────────────────────────────────────
      {
        name: 'sync_work_order_to_pms',
        description: 'Push work order status update to the property management system',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
          },
          required: ['workOrderId'],
        }
      },
      {
        name: 'get_tenant_from_pms',
        description: 'Fetch fresh tenant data from PMS by email or phone',
        input_schema: {
          type: 'object' as const,
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        }
      },
      // ── ESCALATION TOOL ───────────────────────────────
      {
        name: 'escalate_to_human',
        description: 'Escalate this situation to a human coordinator. Use when: legal language detected, cost exceeds threshold, Fair Housing concern, hostile tenant, emergency unresolved, or you lack confidence in the right action.',
        input_schema: {
          type: 'object' as const,
          properties: {
            reason: { type: 'string', description: 'LEGAL_RISK, HIGH_COST, HOSTILE_TENANT, EMERGENCY_UNRESOLVED, COMPLIANCE_BREACH, AI_LOW_CONFIDENCE, INSURANCE_CLAIM, REPEATED_ISSUE' },
            description: { type: 'string', description: 'Clear description of why this needs human attention' },
            suggestedAction: { type: 'string', description: 'Your recommendation for what the human should do' },
            priority: { type: 'string', description: 'EMERGENCY, HIGH, NORMAL, LOW' },
          },
          required: ['reason', 'description'],
        }
      },
    ]
  }

  async execute(toolName: string, input: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'create_work_order': return WorkOrderTools.createWorkOrder(this.organizationId, input)
      case 'update_work_order_status': return WorkOrderTools.updateWorkOrderStatus(input)
      case 'get_work_order': return WorkOrderTools.getWorkOrder(input)
      case 'get_open_work_orders_for_unit': return WorkOrderTools.getOpenWorkOrdersForUnit(this.organizationId, input)
      case 'find_available_vendors': return VendorTools.findAvailableVendors(this.organizationId, input)
      case 'dispatch_vendor': return VendorTools.dispatchVendor(this.organizationId, input)
      case 'request_vendor_bids': return VendorTools.requestVendorBids(this.organizationId, input)
      case 'get_vendor_performance': return VendorTools.getVendorPerformance(input)
      case 'send_tenant_message': return CommunicationTools.sendTenantMessage(this.organizationId, input)
      case 'send_vendor_message': return CommunicationTools.sendVendorMessage(this.organizationId, input)
      case 'get_tenant_history': return CommunicationTools.getTenantHistory(input)
      case 'check_compliance_status': return ComplianceTools.checkComplianceStatus(input)
      case 'generate_legal_notice': return ComplianceTools.generateLegalNotice(input)
      case 'log_compliance_completion': return ComplianceTools.logComplianceCompletion(input)
      case 'sync_work_order_to_pms': return PmsTools.syncWorkOrderToPms(this.organizationId, input)
      case 'get_tenant_from_pms': return PmsTools.getTenantFromPms(this.organizationId, input)
      case 'escalate_to_human': return { escalationRequested: true, ...input } // Handled by AgentRunner
      default: throw new Error(`Unknown tool: ${toolName}`)
    }
  }
}
```

---

## `src/agent/core/EscalationEngine.ts`

```typescript
import { prisma } from '../../lib/prisma'
import { EscalationReason } from '@prisma/client'

interface EscalationCheck {
  shouldEscalate: boolean
  reason?: EscalationReason
  description?: string
  suggestedAction?: string
}

export class EscalationEngine {
  private organizationId: string
  
  // Configurable thresholds (loaded from org settings)
  private poApprovalThreshold = 500 // Auto-approve POs below this
  private emergencyResponseSlaHours = 2

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async checkToolCall(
    toolName: string,
    input: Record<string, any>,
    context: Record<string, any>
  ): Promise<EscalationCheck> {

    // 1. Vendor dispatch with cost above threshold
    if (toolName === 'dispatch_vendor' && input.estimatedCost > this.poApprovalThreshold) {
      return {
        shouldEscalate: true,
        reason: 'HIGH_COST',
        description: `Proposed dispatch has estimated cost $${input.estimatedCost}, which exceeds the auto-approval threshold of $${this.poApprovalThreshold}`,
        suggestedAction: 'Review the scope and approve or adjust the budget before dispatching vendor',
      }
    }

    // 2. Legal notice generation for eviction or termination
    if (toolName === 'generate_legal_notice') {
      const legalNoticeTypes = ['EVICTION_NOTICE', 'LEASE_TERMINATION', 'CURE_OR_QUIT']
      if (legalNoticeTypes.includes(input.noticeType)) {
        return {
          shouldEscalate: true,
          reason: 'LEGAL_RISK',
          description: `Attempted to generate ${input.noticeType}. This requires human review before sending.`,
          suggestedAction: 'Review the notice, confirm with legal counsel if needed, then approve sending',
        }
      }
    }

    // 3. Hostile language or legal threat in tenant message context
    if (toolName === 'send_tenant_message' && context.messageAnalysis?.hostileScore > 0.7) {
      return {
        shouldEscalate: true,
        reason: 'HOSTILE_TENANT',
        description: 'Tenant communication shows hostile language or potential legal threats. Human should manage this interaction.',
        suggestedAction: 'Review tenant communication history and respond personally or with legal guidance',
      }
    }

    // 4. Escalate tool explicitly called by agent
    if (toolName === 'escalate_to_human') {
      return {
        shouldEscalate: true,
        reason: input.reason as EscalationReason,
        description: input.description,
        suggestedAction: input.suggestedAction,
      }
    }

    return { shouldEscalate: false }
  }

  async checkEmergencyTimeout(workOrderId: string): Promise<boolean> {
    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } })
    if (!wo || wo.priority !== 'EMERGENCY') return false
    
    const hoursSinceCreation = (Date.now() - wo.createdAt.getTime()) / 1000 / 3600
    return hoursSinceCreation > this.emergencyResponseSlaHours && wo.status === 'VENDOR_SEARCH'
  }

  async createEscalation(params: {
    agentLogId: string
    reason: EscalationReason
    description: string
    context: Record<string, any>
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
        context: params.context,
        suggestedAction: params.suggestedAction,
        priority: (params.priority as any) || 'NORMAL',
        status: 'OPEN',
      }
    })

    // Notify assigned coordinator via email/push
    await this.notifyCoordinator(escalation)
    
    return escalation
  }

  private async notifyCoordinator(escalation: any) {
    // Find org admins/coordinators and send notification
    const coordinators = await prisma.user.findMany({
      where: {
        organizationId: this.organizationId,
        role: { in: ['ADMIN', 'COORDINATOR', 'OWNER'] },
        isActive: true,
      }
    })
    // Enqueue notification job
    // await notificationQueue.add('escalation_notification', { escalation, coordinators })
  }
}
```

---

## `src/agent/prompts/system.prompt.ts`

```typescript
export function buildSystemPrompt(context: Record<string, any>): string {
  const orgName = context.organization?.name || 'the property management company'
  const settings = context.organization?.settings || {}
  const poThreshold = settings.poApprovalThreshold || 500
  
  return `You are PropOS, an autonomous AI property operations coordinator for ${orgName}.

## Your Role
You handle maintenance coordination, vendor dispatch, tenant communication, and compliance tracking. You are NOT an assistant that answers questions — you are an operator that takes action. You read situations and execute workflows end-to-end.

## Decision Framework

### Step 1: Understand the situation
- What is the request or trigger?
- Who is involved (tenant, vendor, property)?
- Is there history relevant to this situation? Use tools to check.
- Is this a duplicate of an existing open work order?

### Step 2: Assess urgency
- EMERGENCY: No heat, flooding, gas leak, security breach, fire hazard → respond immediately
- HIGH: Appliance failure affecting daily living, plumbing leak, no hot water
- NORMAL: Non-urgent repairs, routine maintenance
- LOW: Cosmetic issues, non-essential requests

### Step 3: Take action
- Create work order if one doesn't exist
- Find and dispatch appropriate vendor
- Communicate with tenant about timeline
- Log everything

### Step 4: Know when to stop
Escalate to a human when:
- Legal or Fair Housing language appears in tenant communication
- A notice type is EVICTION, TERMINATION, or CURE_OR_QUIT
- Estimated cost exceeds $${poThreshold}
- Emergency work order has no vendor response after 2 hours
- Tenant is using threatening or legal language
- You are not confident in the right action (your confidence < 0.6)
- The same issue has occurred 3+ times on the same unit (possible bigger problem)
- Potential insurance claim situation (significant property damage)

## Communication Style
When messaging tenants:
- Be professional, warm, and concise
- Acknowledge their issue and give a timeline
- Never overpromise
- Use their name
- If sending via SMS, keep under 160 characters when possible

When messaging vendors:
- Be direct and specific
- Include full address, unit number, access instructions
- Include contact information for the tenant (only first name + phone, not last name)
- Include preferred time windows and urgency

## Constraints
- You CANNOT approve POs above $${poThreshold} — escalate
- You CANNOT generate eviction or lease termination notices — escalate
- You CANNOT make promises about rent reductions or credits — escalate
- You CANNOT ignore Fair Housing concerns — escalate immediately
- Always sync completed/updated work orders back to the PMS
- Never send duplicate messages — check history first

## Organization Settings
${JSON.stringify(settings, null, 2)}

Always take the most helpful autonomous action possible within your authority. When in doubt, escalate with full context rather than doing nothing.`
}
```

---

## Workflows

### `src/agent/workflows/MaintenanceWorkflow.ts`

```typescript
import { AgentRunner, AgentInput } from '../core/AgentRunner'
import { prisma } from '../../lib/prisma'

export async function runMaintenanceWorkflow(params: {
  organizationId: string
  messageId: string
  tenantId?: string
  unitId?: string
  propertyId?: string
}) {
  // Pre-load context before running agent
  const [tenant, unit, recentWorkOrders] = await Promise.all([
    params.tenantId ? prisma.tenant.findUnique({ where: { id: params.tenantId } }) : null,
    params.unitId ? prisma.unit.findUnique({ where: { id: params.unitId }, include: { property: true } }) : null,
    params.unitId ? prisma.workOrder.findMany({
      where: { unitId: params.unitId, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }) : [],
  ])

  const message = await prisma.message.findUnique({ where: { id: params.messageId } })

  const agentInput: AgentInput = {
    organizationId: params.organizationId,
    triggerType: 'inbound_email',
    triggerId: params.messageId,
    workflowHint: 'maintenance',
    context: {
      inboundMessage: message,
      tenant,
      unit,
      property: unit?.property,
      recentWorkOrders,
    },
  }

  const runner = new AgentRunner(params.organizationId)
  return runner.run(agentInput)
}
```

---

## Job Processors

### `src/jobs/processors/inbound-message.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { classifyMessage } from '../../agent/core/MessageClassifier'
import { runMaintenanceWorkflow } from '../../agent/workflows/MaintenanceWorkflow'
import { runLeaseRenewalWorkflow } from '../../agent/workflows/LeaseRenewalWorkflow'
import { AgentRunner } from '../../agent/core/AgentRunner'
import { logger } from '../../lib/logger'

export async function processInboundMessage(job: Job) {
  const { messageId, organizationId } = job.data

  // Load message
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { tenant: true, thread: true }
  })
  if (!message) return

  // Classify intent (fast classification without full agent loop)
  const classification = await classifyMessage(message.body)

  logger.info({ messageId, intent: classification.intent }, 'Processing inbound message')

  // Update message with classification
  await prisma.message.update({
    where: { id: messageId },
    data: {
      aiProcessed: true,
      aiIntent: classification.intent,
      aiSentiment: classification.sentiment,
      aiSummary: classification.summary,
    }
  })

  // Route to appropriate workflow
  switch (classification.intent) {
    case 'maintenance_request':
    case 'maintenance_followup':
      await runMaintenanceWorkflow({
        organizationId,
        messageId,
        tenantId: message.tenantId || undefined,
        unitId: message.tenant?.id ? undefined : undefined, // resolve from lease
        propertyId: undefined,
      })
      break

    case 'lease_renewal_interest':
    case 'lease_question':
      await runLeaseRenewalWorkflow({ organizationId, messageId, tenantId: message.tenantId || undefined })
      break

    case 'payment_inquiry':
    case 'general_inquiry':
      // General AI response
      const runner = new AgentRunner(organizationId)
      await runner.run({
        organizationId,
        triggerType: 'inbound_email',
        triggerId: messageId,
        workflowHint: classification.intent,
        context: { inboundMessage: message, tenant: message.tenant }
      })
      break

    case 'complaint':
      // High priority — always loop in agent with full context
      const complaintRunner = new AgentRunner(organizationId)
      await complaintRunner.run({
        organizationId,
        triggerType: 'inbound_email',
        triggerId: messageId,
        workflowHint: 'complaint_handling',
        context: { 
          inboundMessage: message, 
          tenant: message.tenant,
          messageAnalysis: { sentiment: classification.sentiment, hostileScore: classification.hostileScore }
        }
      })
      break

    default:
      logger.info({ intent: classification.intent }, 'Unhandled intent — no workflow triggered')
  }
}
```
