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

  getTools(): Array<{
    name: string
    description: string
    input_schema: Record<string, unknown>
  }> {
    return [
      {
        name: 'create_work_order',
        description:
          'Create a new maintenance work order from a tenant request or inspection finding',
        input_schema: {
          type: 'object' as const,
          properties: {
            propertyId: { type: 'string', description: 'Property ID' },
            unitId: { type: 'string', description: 'Unit ID if applicable' },
            tenantId: { type: 'string', description: 'Tenant ID if applicable' },
            title: { type: 'string', description: 'Brief title for the work order' },
            description: { type: 'string', description: 'Detailed description of the issue' },
            category: {
              type: 'string',
              description:
                'Category: PLUMBING, ELECTRICAL, HVAC, APPLIANCE, STRUCTURAL, PEST_CONTROL, LANDSCAPING, GENERAL_MAINTENANCE, EMERGENCY, etc.',
            },
            priority: {
              type: 'string',
              description: 'EMERGENCY (< 4hrs), HIGH (< 24hrs), NORMAL (< 72hrs), LOW (< 7 days)',
            },
            accessInstructions: {
              type: 'string',
              description: 'How vendor should access the unit',
            },
          },
          required: ['propertyId', 'title', 'description', 'category'],
        },
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
        },
      },
      {
        name: 'get_work_order',
        description: 'Get full details of a work order including history and tenant info',
        input_schema: {
          type: 'object' as const,
          properties: { workOrderId: { type: 'string' } },
          required: ['workOrderId'],
        },
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
        },
      },
      {
        name: 'find_available_vendors',
        description: 'Find vendors available for a job based on trade, location, and priority',
        input_schema: {
          type: 'object' as const,
          properties: {
            trade: {
              type: 'string',
              description: 'The trade needed (plumbing, hvac, electrical, etc.)',
            },
            propertyZip: { type: 'string', description: 'ZIP code of the property' },
            priority: {
              type: 'string',
              description: 'Job priority — affects which tier of vendors to contact',
            },
            estimatedBudget: { type: 'number', description: 'Estimated budget for the job' },
          },
          required: ['trade', 'propertyZip', 'priority'],
        },
      },
      {
        name: 'dispatch_vendor',
        description:
          'Assign a vendor to a work order and send them the job details via their preferred channel',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
            vendorId: { type: 'string' },
            estimatedCost: { type: 'number', description: 'Estimated cost for escalation check' },
            schedulingInstructions: {
              type: 'string',
              description: 'Any scheduling constraints or urgency info',
            },
            message: {
              type: 'string',
              description: 'Custom message to include in vendor notification',
            },
          },
          required: ['workOrderId', 'vendorId'],
        },
      },
      {
        name: 'request_vendor_bids',
        description:
          'Send bid request to multiple vendors for a larger job (use when cost > approval threshold or job is complex)',
        input_schema: {
          type: 'object' as const,
          properties: {
            workOrderId: { type: 'string' },
            vendorIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of vendor IDs to request bids from',
            },
            bidDeadlineHours: {
              type: 'number',
              description: 'How many hours vendors have to submit bids',
            },
            scopeOfWork: { type: 'string', description: 'Detailed scope of work for bidding' },
          },
          required: ['workOrderId', 'vendorIds'],
        },
      },
      {
        name: 'get_vendor_performance',
        description: 'Get performance history for a vendor to inform dispatch decisions',
        input_schema: {
          type: 'object' as const,
          properties: { vendorId: { type: 'string' } },
          required: ['vendorId'],
        },
      },
      {
        name: 'send_tenant_message',
        description: 'Send a message to a tenant via their preferred channel (email or SMS)',
        input_schema: {
          type: 'object' as const,
          properties: {
            tenantId: { type: 'string' },
            message: { type: 'string', description: 'Message body' },
            subject: { type: 'string', description: 'Email subject (if sending via email)' },
            channel: {
              type: 'string',
              description:
                'Override channel: EMAIL or SMS. Leave blank to use tenant preference.',
            },
            workOrderId: {
              type: 'string',
              description: 'Link message to a work order thread if applicable',
            },
          },
          required: ['tenantId', 'message'],
        },
      },
      {
        name: 'send_vendor_message',
        description:
          'Send a message to a vendor (scheduling follow-up, additional details, etc.)',
        input_schema: {
          type: 'object' as const,
          properties: {
            vendorId: { type: 'string' },
            message: { type: 'string' },
            subject: { type: 'string' },
            workOrderId: { type: 'string' },
          },
          required: ['vendorId', 'message'],
        },
      },
      {
        name: 'get_tenant_history',
        description:
          'Get recent communication history and work order history for a tenant to understand context',
        input_schema: {
          type: 'object' as const,
          properties: {
            tenantId: { type: 'string' },
            limit: {
              type: 'number',
              description: 'Max number of recent interactions to return (default 20)',
            },
          },
          required: ['tenantId'],
        },
      },
      {
        name: 'check_compliance_status',
        description:
          'Check compliance status for a property — upcoming deadlines, overdue items, at-risk items',
        input_schema: {
          type: 'object' as const,
          properties: { propertyId: { type: 'string' } },
          required: ['propertyId'],
        },
      },
      {
        name: 'generate_legal_notice',
        description:
          'Generate legally correct notice language for a given notice type and jurisdiction',
        input_schema: {
          type: 'object' as const,
          properties: {
            noticeType: {
              type: 'string',
              description:
                'Type: ENTRY_NOTICE, RENT_INCREASE, HABITABILITY, LEASE_RENEWAL, EVICTION_NOTICE, etc.',
            },
            jurisdictionId: { type: 'string' },
            recipientName: { type: 'string' },
            propertyAddress: { type: 'string' },
            additionalDetails: {
              type: 'object',
              description: 'Any specific details needed for this notice type',
            },
          },
          required: ['noticeType', 'jurisdictionId'],
        },
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
        },
      },
      {
        name: 'sync_work_order_to_pms',
        description: 'Push work order status update to the property management system',
        input_schema: {
          type: 'object' as const,
          properties: { workOrderId: { type: 'string' } },
          required: ['workOrderId'],
        },
      },
      {
        name: 'get_tenant_from_pms',
        description: 'Fetch fresh tenant data from PMS by email or phone',
        input_schema: {
          type: 'object' as const,
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
            pmsTenantId: { type: 'string' },
          },
        },
      },
      {
        name: 'escalate_to_human',
        description:
          'Escalate this situation to a human coordinator. Use when: legal language detected, cost exceeds threshold, Fair Housing concern, hostile tenant, emergency unresolved, or you lack confidence in the right action.',
        input_schema: {
          type: 'object' as const,
          properties: {
            reason: {
              type: 'string',
              description:
                'LEGAL_RISK, HIGH_COST, HOSTILE_TENANT, EMERGENCY_UNRESOLVED, COMPLIANCE_BREACH, AI_LOW_CONFIDENCE, INSURANCE_CLAIM, REPEATED_ISSUE',
            },
            description: {
              type: 'string',
              description: 'Clear description of why this needs human attention',
            },
            suggestedAction: {
              type: 'string',
              description: 'Your recommendation for what the human should do',
            },
            priority: {
              type: 'string',
              description: 'EMERGENCY, HIGH, NORMAL, LOW',
            },
          },
          required: ['reason', 'description'],
        },
      },
    ]
  }

  async execute(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'create_work_order':
        return WorkOrderTools.createWorkOrder(this.organizationId, input)
      case 'update_work_order_status':
        return WorkOrderTools.updateWorkOrderStatus(input)
      case 'get_work_order':
        return WorkOrderTools.getWorkOrder(input)
      case 'get_open_work_orders_for_unit':
        return WorkOrderTools.getOpenWorkOrdersForUnit(this.organizationId, input)
      case 'find_available_vendors':
        return VendorTools.findAvailableVendors(this.organizationId, input)
      case 'dispatch_vendor':
        return VendorTools.dispatchVendor(this.organizationId, input)
      case 'request_vendor_bids':
        return VendorTools.requestVendorBids(this.organizationId, input)
      case 'get_vendor_performance':
        return VendorTools.getVendorPerformance(input)
      case 'send_tenant_message':
        return CommunicationTools.sendTenantMessage(this.organizationId, input)
      case 'send_vendor_message':
        return CommunicationTools.sendVendorMessage(this.organizationId, input)
      case 'get_tenant_history':
        return CommunicationTools.getTenantHistory(input)
      case 'check_compliance_status':
        return ComplianceTools.checkComplianceStatus(input)
      case 'generate_legal_notice':
        return ComplianceTools.generateLegalNotice(input)
      case 'log_compliance_completion':
        return ComplianceTools.logComplianceCompletion(input)
      case 'sync_work_order_to_pms':
        return PmsTools.syncWorkOrderToPms(this.organizationId, input)
      case 'get_tenant_from_pms':
        return PmsTools.getTenantFromPms(this.organizationId, input)
      case 'escalate_to_human':
        return { escalationRequested: true, ...input }
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
}
