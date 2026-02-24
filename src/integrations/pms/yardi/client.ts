/**
 * Yardi PMS client — stub for Phase 4.
 * TODO: Implement when Yardi integration is required.
 */
export interface YardiConfig {
  apiKey: string
  endpoint: string
}

export class YardiClient {
  constructor(_config: YardiConfig) {}

  async syncAll(_organizationId: string): Promise<{
    properties: unknown[]
    tenants: unknown[]
    leases: unknown[]
    maintenanceRequests: unknown[]
  }> {
    return { properties: [], tenants: [], leases: [], maintenanceRequests: [] }
  }
}
