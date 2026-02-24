/**
 * Buildium PMS client — stub for Phase 4.
 * TODO: Implement when Buildium integration is required.
 */
export interface BuildiumConfig {
  clientId: string
  clientSecret: string
}

export class BuildiumClient {
  constructor(_config: BuildiumConfig) {}

  async getProperty(_id: string): Promise<unknown> {
    throw new Error('Buildium integration not yet implemented')
  }

  async getTenant(_id: string): Promise<unknown> {
    throw new Error('Buildium integration not yet implemented')
  }

  async getLease(_id: string): Promise<unknown> {
    throw new Error('Buildium integration not yet implemented')
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
