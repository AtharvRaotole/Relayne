export interface AppFolioConfig {
  clientId: string
  clientSecret: string
  domain: string
}

export interface AppFolioProperty {
  id: string
  name: string
  address: Record<string, unknown>
  unit_count?: number
}

export interface AppFolioUnit {
  id: string
  unit_number: string
  property_id: string
  occupied?: boolean
}

export interface AppFolioTenant {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  unit_id?: string
}

export interface AppFolioMaintenanceRequest {
  id: string
  unit_id: string
  subject: string
  status: string
  priority: string
}

export interface AppFolioLease {
  id: string
  unit_id: string
  tenant_id: string
  start_date: string
  end_date: string
  rent?: number
}

export class AppFolioClient {
  private config: AppFolioConfig
  private baseUrl: string

  constructor(config: AppFolioConfig) {
    this.config = config
    this.baseUrl = `https://${config.domain}/api/v1`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64')

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(`AppFolio API error: ${res.status} ${await res.text()}`)
    }

    return res.json() as Promise<T>
  }

  async getProperty(id: string): Promise<AppFolioProperty | null> {
    try {
      return await this.request<AppFolioProperty>('GET', `/properties/${id}`)
    } catch {
      return null
    }
  }

  async getProperties(): Promise<AppFolioProperty[]> {
    const data = await this.request<{ results?: AppFolioProperty[] }>(
      'GET',
      '/properties'
    )
    return data.results ?? []
  }

  async getUnits(propertyId: string): Promise<AppFolioUnit[]> {
    const data = await this.request<{ results?: AppFolioUnit[] }>(
      'GET',
      `/properties/${propertyId}/units`
    )
    return data.results ?? []
  }

  async getTenants(params?: {
    page?: number
    per_page?: number
  }): Promise<AppFolioTenant[]> {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : ''
    const data = await this.request<{ results?: AppFolioTenant[] }>(
      'GET',
      `/tenants${qs}`
    )
    return data.results ?? []
  }

  async getTenant(id: string): Promise<AppFolioTenant | null> {
    try {
      return await this.request<AppFolioTenant>('GET', `/tenants/${id}`)
    } catch {
      return null
    }
  }

  async getTenantByEmail(email: string): Promise<AppFolioTenant | null> {
    const data = await this.request<{ results?: AppFolioTenant[] }>(
      'GET',
      `/tenants?email=${encodeURIComponent(email)}`
    )
    return data.results?.[0] ?? null
  }

  async getMaintenanceRequests(params?: Record<string, string>): Promise<AppFolioMaintenanceRequest[]> {
    const qs = params
      ? '?' + new URLSearchParams(params).toString()
      : ''
    const data = await this.request<{ results?: AppFolioMaintenanceRequest[] }>(
      'GET',
      `/maintenance_requests${qs}`
    )
    return data.results ?? []
  }

  async createMaintenanceRequest(data: {
    unit_id: string
    subject: string
    description: string
    priority: 'urgent' | 'normal' | 'low'
  }): Promise<AppFolioMaintenanceRequest> {
    return this.request('POST', '/maintenance_requests', data)
  }

  async updateMaintenanceRequest(
    id: string,
    data: { status?: string; assigned_to?: string; note?: string }
  ): Promise<AppFolioMaintenanceRequest> {
    return this.request('PATCH', `/maintenance_requests/${id}`, data)
  }

  async getLease(id: string): Promise<AppFolioLease | null> {
    try {
      return await this.request<AppFolioLease>('GET', `/leases/${id}`)
    } catch {
      return null
    }
  }

  async getLeases(params?: { status?: string }): Promise<AppFolioLease[]> {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : ''
    const data = await this.request<{ results?: AppFolioLease[] }>(
      'GET',
      `/leases${qs}`
    )
    return data.results ?? []
  }

  async syncAll(
    organizationId: string
  ): Promise<{
    properties: AppFolioProperty[]
    tenants: AppFolioTenant[]
    leases: AppFolioLease[]
    maintenanceRequests: AppFolioMaintenanceRequest[]
  }> {
    const [properties, tenants, leases, maintenanceRequests] = await Promise.all([
      this.getProperties(),
      this.getTenants(),
      this.getLeases(),
      this.getMaintenanceRequests({ status: 'open' }),
    ])

    return {
      properties,
      tenants,
      leases,
      maintenanceRequests,
    }
  }
}
