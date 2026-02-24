/**
 * Mock data for Relayne frontend - matches API shape from 02_API_ROUTES.md
 */

export const mockProperties = [
  { id: "prop_1", name: "100 Main St", address: "100 Main St, New York, NY", unitCount: 48 },
  { id: "prop_2", name: "Park Ave Tower", address: "200 Park Ave, New York, NY", unitCount: 120 },
];

export const mockWorkOrders = [
  {
    id: "wo_1",
    title: "HVAC not cooling - Unit 4B",
    description: "Tenant reports AC not working, temp at 78°F",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "HVAC",
    property: mockProperties[0],
    unit: { unitNumber: "4B" },
    vendor: { companyName: "QuickCool HVAC" },
    aiHandled: true,
    aiConfidence: 0.94,
    createdAt: "2025-02-22T10:00:00Z",
  },
  {
    id: "wo_2",
    title: "Leak under sink - Unit 2A",
    description: "Water dripping from pipe",
    status: "DISPATCHED",
    priority: "NORMAL",
    category: "Plumbing",
    property: mockProperties[0],
    unit: { unitNumber: "2A" },
    vendor: { companyName: "FastFlow Plumbing" },
    aiHandled: true,
    aiConfidence: 0.89,
    createdAt: "2025-02-22T14:30:00Z",
  },
  {
    id: "wo_3",
    title: "Appliance replacement - Unit 7C",
    description: "Refrigerator not cooling",
    status: "COMPLETED",
    priority: "NORMAL",
    category: "Appliances",
    property: mockProperties[1],
    unit: { unitNumber: "7C" },
    vendor: { companyName: "Appliance Pros" },
    aiHandled: false,
    createdAt: "2025-02-20T09:00:00Z",
  },
];

export const mockTenants = [
  {
    id: "t_1",
    firstName: "Sarah",
    lastName: "Miller",
    email: "sarah.m@email.com",
    unit: { unitNumber: "4B", property: mockProperties[0] },
    churnRiskScore: 0.42,
    daysUntilLeaseEnd: 47,
    openWorkOrders: 1,
    messageCount: 12,
    satisfactionScore: 0.72,
  },
  {
    id: "t_2",
    firstName: "James",
    lastName: "Chen",
    email: "james.c@email.com",
    unit: { unitNumber: "2A", property: mockProperties[0] },
    churnRiskScore: 0.18,
    daysUntilLeaseEnd: 120,
    openWorkOrders: 0,
    messageCount: 5,
    satisfactionScore: 0.91,
  },
];

export const mockVendors = [
  {
    id: "v_1",
    companyName: "QuickCool HVAC",
    contactName: "Mike R.",
    trades: ["HVAC"],
    preferredTier: "preferred",
    avgResponseTimeHours: 2.1,
    avgRating: 4.8,
    completionRate: 0.98,
    jobsCompleted: 45,
  },
  {
    id: "v_2",
    companyName: "FastFlow Plumbing",
    contactName: "Lisa T.",
    trades: ["plumbing"],
    preferredTier: "standard",
    avgResponseTimeHours: 4.5,
    avgRating: 4.6,
    completionRate: 0.95,
    jobsCompleted: 28,
  },
];

export const mockEscalations = [
  {
    id: "e_1",
    description: "Fair Housing concern in tenant message",
    priority: "EMERGENCY",
    reason: "FAIR_HOUSING",
    suggestedAction: "Pause automated response. Forward to legal for review before any reply.",
    createdAt: "2025-02-23T08:00:00Z",
  },
];

export const mockAgentLogs = [
  {
    id: "al_1",
    status: "COMPLETED",
    workflowType: "work_order_triage",
    finalAction: "Vendor dispatch completed",
    createdAt: "2025-02-23T09:15:00Z",
    durationMs: 847,
    tokensUsed: 2341,
    reasoning: "Tenant reported AC failure. Unit 4B has HVAC history. Dispatching QuickCool HVAC, 2.1hr avg response, 4.8★ rating.",
    steps: [
      { toolCalls: [{ tool: "classify_intent", input: { message: "AC not working", unit: "4B" } }] },
      { toolCalls: [{ tool: "dispatch_vendor", input: { trade: "HVAC", priority: "HIGH" } }] },
    ],
  },
];

export const mockDailyActivity = [
  { date: "2025-02-17", created: 12, resolved: 10 },
  { date: "2025-02-18", created: 8, resolved: 14 },
  { date: "2025-02-19", created: 15, resolved: 11 },
  { date: "2025-02-20", created: 10, resolved: 13 },
  { date: "2025-02-21", created: 14, resolved: 12 },
  { date: "2025-02-22", created: 11, resolved: 15 },
  { date: "2025-02-23", created: 9, resolved: 8 },
];
