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

  async getProperty(_id: string): Promise<unknown> {
    throw new Error('Yardi integration not yet implemented')
  }

  async getTenant(_id: string): Promise<unknown> {
    throw new Error('Yardi integration not yet implemented')
  }

  async getLease(_id: string): Promise<unknown> {
    throw new Error('Yardi integration not yet implemented')
  }

  async syncAll(_organizationId: string): Promise<{
    properties: unknown[]
    tenants: unknown[]
    leases: unknown[]
    maintenanceRequests: unknown[]
  }> {
    return { properties: [], tenants: [], leases: [], maintenanceRequests: [] }
  }
}
