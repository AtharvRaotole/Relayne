# Dashboard — Internal App Specification
## Shell Layout + All Pages

---

## Shell Layout — `app/(dashboard)/layout.tsx`

```
Overall: 100vh, no scroll on shell
Left:    Sidebar — 240px wide, dark (#0f1117), fixed
Right:   Content area — flex-col, topbar + scrollable main
```

### Sidebar — `components/dashboard/Sidebar.tsx`

```tsx
// Structure
<aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0f1117] border-r border-[#2d3048] flex flex-col">
  
  {/* Logo area */}
  <div className="h-14 flex items-center px-5 border-b border-[#2d3048]">
    <Logo />
    {/* AI status indicator — tiny animated dot */}
    <div className="ml-auto flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <span className="text-[10px] text-[#4a5568] font-medium">AI Active</span>
    </div>
  </div>

  {/* Quick Actions */}
  <div className="px-3 py-3 border-b border-[#2d3048]">
    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1a1d2e] hover:bg-[#232640] text-[#94a3b8] text-xs font-medium transition-colors">
      <Search className="w-3.5 h-3.5" />
      Quick search...
      <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#2d3048] text-[#64748b]">⌘K</kbd>
    </button>
  </div>

  {/* Navigation */}
  <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
    
    {/* Main nav items */}
    <NavItem href="/overview" icon={<LayoutDashboard />} label="Overview" />
    
    <NavGroup label="Operations">
      <NavItem href="/work-orders" icon={<Wrench />} label="Work Orders" badge={12} badgeVariant="blue" />
      <NavItem href="/escalations" icon={<AlertTriangle />} label="Escalations" badge={3} badgeVariant="red" />
      <NavItem href="/communications" icon={<MessageSquare />} label="Communications" badge={8} badgeVariant="gray" />
    </NavGroup>
    
    <NavGroup label="Portfolio">
      <NavItem href="/properties" icon={<Building2 />} label="Properties" />
      <NavItem href="/tenants" icon={<Users />} label="Tenants" />
      <NavItem href="/vendors" icon={<HardHat />} label="Vendors" />
    </NavGroup>
    
    <NavGroup label="Compliance">
      <NavItem href="/compliance" icon={<ShieldCheck />} label="Compliance" badge={2} badgeVariant="orange" />
      <NavItem href="/invoices" icon={<Receipt />} label="Invoices" />
    </NavGroup>
    
    <NavGroup label="Intelligence">
      <NavItem href="/analytics" icon={<BarChart3 />} label="Analytics" />
      <NavItem href="/ai-activity" icon={<Bot />} label="AI Activity" />
    </NavGroup>
    
  </nav>

  {/* Bottom: User + settings */}
  <div className="p-3 border-t border-[#2d3048]">
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#1a1d2e] cursor-pointer transition-colors">
      <Avatar className="w-7 h-7 text-xs" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#e2e8f0] truncate">Sarah Miller</p>
        <p className="text-[10px] text-[#64748b] truncate">Demo Property Co</p>
      </div>
      <Settings className="w-3.5 h-3.5 text-[#4a5568]" />
    </div>
  </div>
</aside>
```

**NavItem component:**
```tsx
function NavItem({ href, icon, label, badge, badgeVariant }) {
  const isActive = usePathname() === href
  return (
    <Link href={href} className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
      isActive
        ? 'bg-[#1a1d2e] text-white font-medium'
        : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#141620]'
    )}>
      <span className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-brand-400' : '')}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge && <Badge variant={badgeVariant} size="xs">{badge}</Badge>}
    </Link>
  )
}
```

### Topbar — `components/dashboard/Topbar.tsx`

```tsx
<header className="h-14 border-b border-gray-100 bg-white flex items-center px-6 gap-4">
  {/* Page title — changes per page */}
  <h1 className="font-display text-sm font-semibold text-gray-900">{pageTitle}</h1>
  
  {/* Breadcrumb on sub-pages */}
  <Breadcrumb />
  
  <div className="ml-auto flex items-center gap-2">
    
    {/* AI processing indicator — shows when agent is running */}
    <AIStatusPill />  {/* "AI handling 3 tickets" with spinner */}
    
    {/* Notifications bell */}
    <NotificationsDropdown />
    
    {/* Property switcher (multi-property orgs) */}
    <PropertySwitcher />
    
  </div>
</header>
```

**AI Status Pill:**
```tsx
// Shows when agent jobs are queued/processing
function AIStatusPill({ activeJobs }) {
  if (!activeJobs) return null
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-xs font-medium text-brand-700">
      <div className="w-3 h-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      AI handling {activeJobs} ticket{activeJobs > 1 ? 's' : ''}
    </div>
  )
}
```

---

## Page 1: Overview / Portfolio Dashboard — `app/(dashboard)/overview/page.tsx`

```
This is the landing page inside the app.
Think: control center. Not pretty, functional.
Heavy on numbers, status, and recent activity.
```

### Layout (2-column grid)

```
Row 1: 4 KPI stat cards (full width)
Row 2: Left 60% = Work Order Activity chart | Right 40% = AI Performance ring
Row 3: Left 60% = Recent Escalations table | Right 40% = Compliance Risk
Row 4: Full width = Recent Work Orders (last 10, with status)
```

### KPI Stat Cards

```tsx
<div className="grid grid-cols-4 gap-4">
  <StatCard
    label="Open Work Orders"
    value={47}
    delta={{ value: -12, label: "vs last week", positive: true }}
    icon={<Wrench className="w-4 h-4" />}
    iconBg="bg-blue-50 text-blue-600"
  />
  <StatCard
    label="AI Resolution Rate"
    value="78%"
    delta={{ value: +3.2, label: "vs last month", positive: true }}
    icon={<Bot className="w-4 h-4" />}
    iconBg="bg-brand-50 text-brand-600"
  />
  <StatCard
    label="Escalations Open"
    value={3}
    delta={{ value: -1, label: "vs yesterday", positive: true }}
    icon={<AlertTriangle className="w-4 h-4" />}
    iconBg="bg-red-50 text-red-600"
    urgent={3 > 0}
  />
  <StatCard
    label="Compliance Tasks Due"
    value={5}
    delta={{ value: 0, label: "this week" }}
    icon={<ShieldCheck className="w-4 h-4" />}
    iconBg="bg-orange-50 text-orange-600"
    urgent={5 > 3}
  />
</div>
```

**StatCard Component:**
```tsx
function StatCard({ label, value, delta, icon, iconBg, urgent }) {
  return (
    <div className={cn(
      "bg-white rounded-xl border p-5",
      urgent ? "border-red-200 ring-1 ring-red-100" : "border-gray-100"
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-gray-950 mb-1">{value}</p>
      {delta && (
        <p className={cn("text-xs", delta.positive ? "text-green-600" : "text-red-500")}>
          {delta.positive ? "↑" : "↓"} {Math.abs(delta.value)} {delta.label}
        </p>
      )}
    </div>
  )
}
```

### Work Order Activity Chart

```tsx
// Recharts AreaChart — tickets created vs resolved per day (last 30 days)
<div className="bg-white rounded-xl border border-gray-100 p-5">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-semibold text-gray-900">Work Order Activity</h3>
      <p className="text-xs text-gray-400 mt-0.5">Tickets created vs resolved</p>
    </div>
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Created
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Resolved
      </div>
    </div>
  </div>
  <AreaChart
    data={dailyData}
    height={200}
    series={[
      { key: 'created', color: '#6366f1', name: 'Created' },
      { key: 'resolved', color: '#10b981', name: 'Resolved' },
    ]}
  />
</div>
```

### AI Performance Ring

```tsx
<div className="bg-white rounded-xl border border-gray-100 p-5">
  <h3 className="text-sm font-semibold text-gray-900 mb-4">AI Automation</h3>
  
  {/* Donut chart showing AI-handled vs human-touched */}
  <DonutChart
    data={[
      { name: 'AI Handled', value: 78, color: '#6366f1' },
      { name: 'Escalated', value: 8, color: '#f97316' },
      { name: 'Manual', value: 14, color: '#e5e7eb' },
    ]}
    centerLabel="78%"
    centerSub="automated"
    size={160}
  />
  
  {/* Stats below chart */}
  <div className="mt-4 space-y-2">
    <AIMetricRow label="Tickets handled autonomously" value={78} color="brand" />
    <AIMetricRow label="Hours saved this month" value="312h" />
    <AIMetricRow label="Avg handling time" value="4.2 min" />
  </div>
</div>
```

---

## Page 2: Work Orders — `app/(dashboard)/work-orders/page.tsx`

### Layout

```
Top: Filters bar + New Work Order button
Body: Table with status-driven rows
```

### Filters Bar

```tsx
<div className="flex items-center gap-3">
  <FilterPill label="Status" options={WORK_ORDER_STATUSES} value={statusFilter} />
  <FilterPill label="Priority" options={PRIORITIES} value={priorityFilter} />
  <FilterPill label="Property" options={properties} value={propertyFilter} />
  <FilterPill label="Assigned" options={['AI Handled', 'Vendor Dispatched', 'Unassigned']} />
  <DateRangePicker />
  
  <div className="ml-auto flex items-center gap-2">
    <Input placeholder="Search work orders..." className="w-60 h-8 text-sm" prefix={<Search />} />
    <Button size="sm">
      <Plus className="w-3.5 h-3.5 mr-1.5" /> New Work Order
    </Button>
  </div>
</div>
```

### Work Orders Table

```tsx
// Columns:
// ┌─ Priority dot │ Title & Property │ Category │ Status badge │ Vendor │ AI/Human tag │ Created │ ─────┐

<Table>
  <TableHeader>
    <Column width="w-8">  {/* Priority color dot */} </Column>
    <Column flex>Title</Column>
    <Column width="w-28">Category</Column>
    <Column width="w-36">Status</Column>
    <Column width="w-32">Vendor</Column>
    <Column width="w-24">Handler</Column>
    <Column width="w-28">Created</Column>
    <Column width="w-16"> {/* Actions */} </Column>
  </TableHeader>
  
  {workOrders.map(wo => (
    <TableRow key={wo.id} onClick={() => router.push(`/work-orders/${wo.id}`)}>
      {/* Priority dot */}
      <td>
        <div className={cn("w-2 h-2 rounded-full mx-auto", PRIORITY_DOTS[wo.priority])} />
      </td>
      
      {/* Title + property */}
      <td>
        <p className="text-sm font-medium text-gray-900 truncate">{wo.title}</p>
        <p className="text-xs text-gray-400">{wo.property.name} · Unit {wo.unit?.unitNumber || 'N/A'}</p>
      </td>
      
      {/* Category chip */}
      <td>
        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 font-medium border border-gray-100">
          {formatCategory(wo.category)}
        </span>
      </td>
      
      {/* Status badge */}
      <td>
        <StatusBadge status={wo.status} />
      </td>
      
      {/* Vendor */}
      <td>
        <p className="text-xs text-gray-700 truncate">{wo.vendor?.companyName || '—'}</p>
      </td>
      
      {/* AI or human */}
      <td>
        {wo.aiHandled ? (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
            <Bot className="w-2.5 h-2.5" /> AI
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 font-medium">
            <User className="w-2.5 h-2.5" /> Manual
          </span>
        )}
      </td>
      
      <td className="text-xs text-gray-400">{formatRelativeTime(wo.createdAt)}</td>
      
      <td>
        <DropdownMenu trigger={<MoreHorizontal className="w-4 h-4" />}>
          <DropdownItem>View details</DropdownItem>
          <DropdownItem>Reassign vendor</DropdownItem>
          <DropdownItem>Escalate</DropdownItem>
          <DropdownItem destructive>Cancel</DropdownItem>
        </DropdownMenu>
      </td>
    </TableRow>
  ))}
</Table>
```

---

## Page 3: Work Order Detail — `app/(dashboard)/work-orders/[id]/page.tsx`

### Layout: 3-column

```
Left (35%):  Work order info + actions
Center (40%): Activity timeline (messages, events)
Right (25%): Tenant info + Vendor info cards
```

### Left Panel

```tsx
<div className="space-y-4">
  
  {/* Header */}
  <div>
    <PriorityBadge priority={wo.priority} />
    <h1 className="text-xl font-display font-bold text-gray-950 mt-2">{wo.title}</h1>
    <p className="text-sm text-gray-500 mt-1">{wo.property.name} · Unit {wo.unit?.unitNumber}</p>
  </div>
  
  {/* Status stepper */}
  <StatusStepper currentStatus={wo.status} steps={WORK_ORDER_STEPS} />
  
  {/* Description */}
  <InfoCard label="Description">
    <p className="text-sm text-gray-700">{wo.description}</p>
  </InfoCard>
  
  {/* Details grid */}
  <InfoCard label="Details">
    <dl className="space-y-2 text-sm">
      <InfoRow label="Category" value={wo.category} />
      <InfoRow label="Created" value={formatDate(wo.createdAt)} />
      <InfoRow label="Scheduled" value={wo.scheduledAt ? formatDate(wo.scheduledAt) : 'TBD'} />
      <InfoRow label="PO Number" value={wo.poNumber || 'Not generated'} />
      <InfoRow label="Est. Cost" value={wo.estimatedCost ? `$${wo.estimatedCost}` : 'TBD'} />
    </dl>
  </InfoCard>
  
  {/* AI handling indicator */}
  {wo.aiHandled && (
    <div className="rounded-lg bg-brand-50 border border-brand-100 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4 text-brand-600" />
        <span className="text-xs font-semibold text-brand-700">Handled by AI</span>
      </div>
      <p className="text-xs text-brand-600">Confidence: {Math.round(wo.aiConfidence * 100)}%</p>
      <button className="text-xs text-brand-700 underline mt-1">View AI reasoning →</button>
    </div>
  )}
  
  {/* Action buttons */}
  <div className="space-y-2">
    <Button className="w-full" variant="outline" size="sm">
      <UserPlus className="w-3.5 h-3.5 mr-2" /> Reassign Vendor
    </Button>
    <Button className="w-full" variant="outline" size="sm">
      <MessageSquare className="w-3.5 h-3.5 mr-2" /> Message Tenant
    </Button>
    {wo.status !== 'COMPLETED' && (
      <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm">
        <CheckCircle className="w-3.5 h-3.5 mr-2" /> Mark Complete
      </Button>
    )}
    <Button className="w-full" variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
      <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Escalate
    </Button>
  </div>
  
</div>
```

### Center Panel: Activity Timeline

```tsx
<div>
  <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Timeline</h3>
  
  {/* Message input */}
  <div className="rounded-xl border border-gray-200 p-3 mb-4">
    <textarea
      placeholder="Add a note or send a message to tenant/vendor..."
      className="w-full text-sm resize-none outline-none text-gray-700"
      rows={2}
    />
    <div className="flex items-center justify-between mt-2">
      <div className="flex gap-2">
        <Button variant="ghost" size="xs">To Tenant</Button>
        <Button variant="ghost" size="xs">To Vendor</Button>
        <Button variant="ghost" size="xs">Internal Note</Button>
      </div>
      <Button size="xs">Send</Button>
    </div>
  </div>
  
  {/* Timeline */}
  <div className="space-y-0">
    {timeline.map((event, i) => (
      <TimelineEvent key={event.id} event={event} isLast={i === timeline.length - 1} />
    ))}
  </div>
</div>
```

**TimelineEvent:**
```tsx
function TimelineEvent({ event, isLast }) {
  const isMessage = event.eventType === 'message'
  const isAI = event.actorType === 'ai'
  
  return (
    <div className="flex gap-3 pb-4">
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs",
          isAI ? "bg-brand-50 border-brand-200 text-brand-600" : "bg-white border-gray-200 text-gray-500"
        )}>
          {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">{event.actorLabel}</span>
          <span className="text-[10px] text-gray-400">{formatRelativeTime(event.createdAt)}</span>
          {isAI && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 font-medium">AI</span>}
        </div>
        
        {isMessage ? (
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
            {event.description}
          </div>
        ) : (
          <p className="text-sm text-gray-600">{event.description}</p>
        )}
      </div>
    </div>
  )
}
```

---

## Page 4: Tenants — `app/(dashboard)/tenants/page.tsx`

### Tenant Cards Grid (instead of table — more visual)

```tsx
<div className="grid grid-cols-3 gap-4">
  {tenants.map(tenant => (
    <TenantCard key={tenant.id} tenant={tenant} />
  ))}
</div>
```

**TenantCard:**
```tsx
function TenantCard({ tenant }) {
  const churnColor = tenant.churnRiskScore > 0.6 ? 'red' : tenant.churnRiskScore > 0.35 ? 'amber' : 'green'
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={`${tenant.firstName} ${tenant.lastName}`} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{tenant.firstName} {tenant.lastName}</p>
            <p className="text-xs text-gray-400">{tenant.unit?.unitNumber} · {tenant.unit?.property?.name}</p>
          </div>
        </div>
        {/* Churn risk indicator */}
        <div className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", {
          'bg-red-50 text-red-600': churnColor === 'red',
          'bg-amber-50 text-amber-600': churnColor === 'amber',
          'bg-green-50 text-green-600': churnColor === 'green',
        })}>
          {Math.round(tenant.churnRiskScore * 100)}% churn risk
        </div>
      </div>
      
      {/* Lease countdown */}
      {tenant.daysUntilLeaseEnd && (
        <div className="text-xs text-gray-500 mb-2">
          Lease ends in <strong>{tenant.daysUntilLeaseEnd} days</strong>
        </div>
      )}
      
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
        <TenantStat label="Open WOs" value={tenant.openWorkOrders} />
        <TenantStat label="Messages" value={tenant.messageCount} />
        <TenantStat label="Satisfaction" value={`${Math.round(tenant.satisfactionScore * 100)}%`} />
      </div>
    </div>
  )
}
```

---

## Page 5: Vendors — `app/(dashboard)/vendors/page.tsx`

### Vendor Table with Performance Bars

```
Columns: Name | Trades | Tier badge | Response Time | Rating bar | Completion Rate | Jobs | Status | Actions
```

```tsx
<TableRow>
  <td>
    <div>
      <p className="text-sm font-medium text-gray-900">{vendor.companyName}</p>
      <p className="text-xs text-gray-400">{vendor.contactName}</p>
    </div>
  </td>
  
  <td>
    <div className="flex flex-wrap gap-1">
      {vendor.trades.map(t => (
        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-600 capitalize">
          {t}
        </span>
      ))}
    </div>
  </td>
  
  <td>
    <TierBadge tier={vendor.preferredTier} />
  </td>
  
  {/* Response time with colored indicator */}
  <td>
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", {
        'bg-green-500': vendor.avgResponseTimeHours <= 4,
        'bg-amber-500': vendor.avgResponseTimeHours <= 12,
        'bg-red-500': vendor.avgResponseTimeHours > 12,
      })} />
      <span className="text-sm text-gray-700">{vendor.avgResponseTimeHours}h avg</span>
    </div>
  </td>
  
  {/* Rating bar */}
  <td>
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(vendor.avgRating / 5) * 100}%` }} />
      </div>
      <span className="text-xs text-gray-600">{vendor.avgRating.toFixed(1)}</span>
    </div>
  </td>
</TableRow>
```

---

## Page 6: Compliance — `app/(dashboard)/compliance/page.tsx`

### Calendar + List hybrid view

```tsx
<div className="grid grid-cols-[1fr_320px] gap-6">
  
  {/* Left: Compliance task list */}
  <div>
    {/* Risk summary bar */}
    <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <div>
          <p className="text-sm font-semibold text-red-800">2 overdue items require immediate attention</p>
          <p className="text-xs text-red-600 mt-0.5">Elevator inspection at 100 Main + Sprinkler test at Park Ave</p>
        </div>
      </div>
      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">Review Now</Button>
    </div>
    
    {/* Grouped by status */}
    <ComplianceGroup label="Overdue" variant="red" tasks={overdueTasks} />
    <ComplianceGroup label="Due This Week" variant="orange" tasks={urgentTasks} />
    <ComplianceGroup label="Due This Month" variant="yellow" tasks={dueSoonTasks} />
    <ComplianceGroup label="Upcoming" variant="gray" tasks={upcomingTasks} />
  </div>
  
  {/* Right: Mini calendar */}
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <h3 className="text-sm font-semibold mb-3">Compliance Calendar</h3>
    <ComplianceCalendar tasks={allTasks} />
    
    {/* Jurisdiction selector */}
    <div className="mt-4 pt-4 border-t border-gray-50">
      <p className="text-xs font-medium text-gray-500 mb-2">Jurisdictions</p>
      {jurisdictions.map(j => (
        <div key={j.id} className="flex items-center gap-2 text-xs text-gray-600 py-1">
          <div className="w-2 h-2 rounded-full bg-brand-400" />
          {j.name}
        </div>
      ))}
    </div>
  </div>
</div>
```

---

## Page 7: Communications — `app/(dashboard)/communications/page.tsx`

### Email-client style layout

```tsx
<div className="grid grid-cols-[300px_1fr] h-[calc(100vh-112px)]">
  
  {/* Left: Thread list */}
  <div className="border-r border-gray-100 overflow-y-auto">
    {/* Filters: All / Tenants / Vendors / Unread */}
    <div className="flex gap-1 p-3 border-b border-gray-100">
      {['All', 'Tenants', 'Vendors', 'Unread'].map(f => (
        <button key={f} className={cn(
          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
          activeFilter === f ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
        )}>{f}</button>
      ))}
    </div>
    
    {threads.map(thread => <ThreadListItem key={thread.id} thread={thread} />)}
  </div>
  
  {/* Right: Thread detail */}
  <div className="flex flex-col">
    <ThreadHeader thread={activeThread} />
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
    </div>
    <MessageComposer />
  </div>
</div>
```

---

## Page 8: Escalations — `app/(dashboard)/escalations/page.tsx`

```tsx
{/* Priority-sorted list with context panels */}
{escalations.map(esc => (
  <EscalationCard key={esc.id} escalation={esc} />
))}
```

**EscalationCard:**
```tsx
function EscalationCard({ escalation }) {
  return (
    <div className={cn(
      "bg-white rounded-xl border p-5",
      escalation.priority === 'EMERGENCY' ? "border-red-200 ring-1 ring-red-100" : "border-gray-100"
    )}>
      <div className="flex items-start gap-4">
        {/* Reason icon */}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", ESCALATION_ICON_BG[escalation.reason])}>
          {ESCALATION_ICONS[escalation.reason]}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{escalation.description}</span>
            <PriorityBadge priority={escalation.priority} />
          </div>
          <p className="text-xs text-gray-500 mb-3">{formatRelativeTime(escalation.createdAt)}</p>
          
          {/* AI's suggested action */}
          <div className="bg-brand-50 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-xs font-semibold text-brand-700">PropOS Recommendation</span>
            </div>
            <p className="text-xs text-brand-700">{escalation.suggestedAction}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-gray-950 text-white">Resolve</Button>
            <Button size="sm" variant="outline">Assign to me</Button>
            <Button size="sm" variant="ghost">View context</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Page 9: Analytics — `app/(dashboard)/analytics/page.tsx`

### Layout: Dashboard grid with charts

```
Row 1: Date range picker + property filter (top right)
Row 2: 5 key metrics (horizontal strip)
Row 3: Left - Work Order Resolution Trends (line) | Right - Category Breakdown (bar)
Row 4: Left - Vendor Performance Table | Right - Churn Risk Distribution (scatter or bar)
Row 5: Full - Portfolio Benchmarking (your org vs peers)
Row 6: Full - Capital Expenditure Forecast (stacked bar by year)
```

**Benchmark comparison (standout feature UI):**
```tsx
<div className="bg-white rounded-xl border border-gray-100 p-5">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-semibold">Portfolio Benchmarks</h3>
      <p className="text-xs text-gray-400">vs. similar-sized operators (anonymized)</p>
    </div>
    <span className="text-xs text-gray-400">Peer group: 800–4,000 units</span>
  </div>
  
  {BENCHMARK_METRICS.map(metric => (
    <BenchmarkRow key={metric.key}
      label={metric.label}
      yourValue={metric.yours}
      peerMedian={metric.median}
      unit={metric.unit}
      higherIsBetter={metric.higherIsBetter}
    />
  ))}
</div>
```

---

## Page 10: AI Activity — `app/(dashboard)/ai-activity/page.tsx`

### Agent transparency log — key differentiator in demos

```tsx
<div className="space-y-3">
  {agentLogs.map(log => (
    <div key={log.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Log header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", {
          'bg-green-100 text-green-700': log.status === 'COMPLETED',
          'bg-orange-100 text-orange-700': log.status === 'ESCALATED',
          'bg-red-100 text-red-700': log.status === 'FAILED',
        })}>
          {STATUS_ICONS[log.status]}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{log.finalAction || log.workflowType}</p>
          <p className="text-xs text-gray-400">{formatRelativeTime(log.createdAt)} · {log.durationMs}ms · {log.tokensUsed.toLocaleString()} tokens</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border">
            {log.workflowType}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 cursor-pointer" />
        </div>
      </div>
      
      {/* Expandable steps */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 space-y-2">
          {log.steps.map((step, i) => (
            <div key={i} className="text-xs font-mono">
              <span className="text-gray-400">#{i+1}</span>
              {step.toolCalls.map(call => (
                <div key={call.tool} className="ml-4 mt-1">
                  <span className="text-brand-600">→ {call.tool}</span>
                  <span className="text-gray-400 ml-2">{JSON.stringify(call.input).slice(0, 80)}...</span>
                </div>
              ))}
            </div>
          ))}
          {log.reasoning && (
            <div className="mt-2 p-2.5 bg-white rounded-lg border border-gray-100 text-xs text-gray-600 italic">
              "{log.reasoning.slice(0, 300)}..."
            </div>
          )}
        </div>
      )}
    </div>
  ))}
</div>
```
