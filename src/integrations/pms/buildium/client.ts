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

  async syncAll(_organizationId: string): Promise<{
    properties: unknown[]
    tenants: unknown[]
    leases: unknown[]
    maintenanceRequests: unknown[]
  }> {
    return { properties: [], tenants: [], leases: [], maintenanceRequests: [] }
  }
}
