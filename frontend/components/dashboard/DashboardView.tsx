'use client'

import React, { useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Download,
  Plus,
  Search,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiFetch } from '@/lib/api/client'
import { Inspection, InfrastructureAsset } from '@/types'

interface DashboardViewProps {
  onNavigate: (tab: any, params?: any) => void
  onOpenNewInspection: () => void
}

export function DashboardView({ onNavigate, onOpenNewInspection }: DashboardViewProps) {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [assets, setAssets] = useState<InfrastructureAsset[]>([])
  const [dataStatus, setDataStatus] = useState<'loading' | 'live' | 'error'>('loading')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL')

  useEffect(() => {
    let active = true
    const loadLiveData = async () => {
      try {
        const [inspectionResponse, assetResponse] = await Promise.all([
          apiFetch<Inspection[]>('/api/v1/inspections', { cache: 'no-store' }),
          apiFetch<InfrastructureAsset[]>('/api/v1/assets', { cache: 'no-store' }),
        ])
        if (!active) return
        setInspections(inspectionResponse.data)
        setAssets(assetResponse.data)
        setDataStatus('live')
        setLastUpdated(new Date())
      } catch {
        if (active) setDataStatus('error')
      }
    }

    loadLiveData()
    const intervalId = window.setInterval(loadLiveData, 15_000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  const filtered = inspections.filter((item) => {
    const matchesSearch = `${item.id} ${item.assetName} ${item.assetType}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesSeverity =
      selectedSeverity === 'ALL' || item.overallSeverity.toUpperCase() === selectedSeverity
    return matchesSearch && matchesSeverity
  })

  const pendingReviewCount = inspections.filter(
    (i) => i.status === 'Pending Engineer Review'
  ).length
  const highPriorityCount = inspections.filter(
    (i) => i.priority === 'High' || i.priority === 'Urgent'
  ).length

  const findings = inspections.flatMap((inspection) =>
    (inspection.images || []).flatMap((image) => image.findings || [])
  )
  const criticalCount = findings.filter((finding) => finding.severity === 'Critical').length
  const severeCount = findings.filter((finding) => finding.severity === 'Severe').length
  const moderateCount = findings.filter((finding) => finding.severity === 'Moderate').length
  const minorCount = findings.filter((finding) => finding.severity === 'Minor').length
  const totalFindings = findings.length

  const activityData = Array.from({ length: 9 }, (_, index) => {
    const monthDate = new Date()
    monthDate.setDate(1)
    monthDate.setMonth(monthDate.getMonth() - (8 - index))
    return {
      month: new Intl.DateTimeFormat('en', { month: 'short' }).format(monthDate),
      inspections: inspections.filter((inspection) => {
        const date = new Date(inspection.date)
        return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth()
      }).length,
    }
  })

  const upcomingAssets = assets
    .filter((asset) => {
      const dueDate = new Date(asset.nextScheduledInspection)
      return !Number.isNaN(dueDate.getTime()) && dueDate >= new Date()
    })
    .sort((left, right) => new Date(left.nextScheduledInspection).getTime() - new Date(right.nextScheduledInspection).getTime())
    .slice(0, 3)

  const attentionList = inspections
    .filter(
      (i) =>
        i.status === 'Pending Engineer Review' ||
        i.overallSeverity === 'Severe' ||
        i.overallSeverity === 'Critical'
    )
    .slice(0, 3)

  return (
    <div className="page-wrap">
      {/* Page Heading */}
      <section className="page-heading">
        <div>
          <p className="eyebrow">OPERATIONAL OVERVIEW · REAL-TIME INFRASTRUCTURE STATUS</p>
          <h1>Infrastructure Overview</h1>
          <p>Continuous AI-assisted crack & damage monitoring across civil infrastructure assets.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => window.print()}>
            <Download /> Export summary
          </button>
          <button className="button primary" onClick={onOpenNewInspection}>
            <Plus /> New inspection
          </button>
        </div>
      </section>

      {/* Live data status */}
      <div className="context-bar">
        <div className="range">
          <CalendarDays />
          <span>Live operational data</span>
        </div>
        <span className="sample-note">
          {dataStatus === 'loading'
            ? 'Connecting to backend…'
            : dataStatus === 'error'
              ? `Backend unavailable${lastUpdated ? ` · showing data from ${lastUpdated.toLocaleTimeString()}` : ''}`
              : `Backend data · seeded rows may be included · updated ${lastUpdated?.toLocaleTimeString()} · refreshes every 15 seconds`}
        </span>
      </div>

      {/* Stat KPI Cards */}
      <section className="stats-grid">
        <div
          className="stat-card cursor-pointer hover:border-blue-400 transition"
          onClick={() => onNavigate('Assets')}
        >
          <div className="stat-icon">
            <Building2 />
          </div>
          <div className="stat-copy">
            <p>Infrastructure assets</p>
            <strong>{assets.length}</strong>
            <span className="positive">{assets.filter((a) => a.importance.includes('Critical')).length} Critical Priority</span>
          </div>
        </div>

        <div
          className="stat-card cursor-pointer hover:border-teal-400 transition"
          onClick={() => onNavigate('All Inspections')}
        >
          <div className="stat-icon teal">
            <ClipboardCheck />
          </div>
          <div className="stat-copy">
            <p>Total inspections</p>
            <strong>{inspections.length}</strong>
            <span className="positive">From backend records</span>
          </div>
        </div>

        <div
          className="stat-card cursor-pointer hover:border-amber-400 transition"
          onClick={() => onNavigate('Analysis Results')}
        >
          <div className="stat-icon amber">
            <Clock3 />
          </div>
          <div className="stat-copy">
            <p>Pending engineer review</p>
            <strong>{pendingReviewCount}</strong>
            <span className="neutral">Action required</span>
          </div>
        </div>

        <div
          className="stat-card cursor-pointer hover:border-red-400 transition"
          onClick={() => onNavigate('Maintenance & Work Orders')}
        >
          <div className="stat-icon red">
            <AlertTriangle />
          </div>
          <div className="stat-copy">
            <p>High-priority inspections</p>
            <strong>{highPriorityCount}</strong>
            <span className="text-red-500 text-[9px] font-semibold">Priority repair attention</span>
          </div>
        </div>
      </section>

      {/* Analytics & Severity Breakdown */}
      <section className="dashboard-grid">
        <div className="panel activity-panel">
          <div className="panel-head">
            <div>
              <h2>Inspection activity</h2>
              <p>Completed structural image inspections over time</p>
            </div>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onNavigate('Damage Analytics')}
            >
              Full Analytics →
            </button>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-blue" /> Monthly Inspections
            </span>
            <span className="trend">Previous 9 months</span>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8eef5" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8a9ab1', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8a9ab1', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    border: '1px solid #dce5ef',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px #172b4d18',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="inspections"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#fillBlue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel severity-panel">
          <div className="panel-head">
            <div>
              <h2>Damage severity</h2>
              <p>Distribution of detected defects</p>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <strong>{totalFindings}</strong>
                <small>Total Defects</small>
              </div>
            </div>
            <div className="severity-list">
              <div>
                <i className="dot critical" />
                <span>Critical</span>
                <b>{criticalCount}</b>
              </div>
              <div>
                <i className="dot severe" />
                <span>Severe</span>
                <b>{severeCount}</b>
              </div>
              <div>
                <i className="dot moderate" />
                <span>Moderate</span>
                <b>{moderateCount}</b>
              </div>
              <div>
                <i className="dot minor" />
                <span>Minor</span>
                <b>{minorCount}</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lower Section: Recent Inspections Table + Action Queue */}
      <section className="lower-grid">
        <div className="panel table-panel">
          <div className="panel-head table-head">
            <div>
              <h2>Recent inspections</h2>
              <p>Latest structural surveys and AI-assisted defect reports</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('All Inspections')}>
              View all <ArrowUpRight />
            </button>
          </div>

          <div className="table-tools">
            <label className="table-search">
              <Search />
              <input
                placeholder="Search by ID or asset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="flex gap-1">
              {['ALL', 'CRITICAL', 'SEVERE', 'MODERATE', 'MINOR'].map((sev) => (
                <button
                  key={sev}
                  className={`text-[10px] px-2 py-1 rounded border ${
                    selectedSeverity === sev
                      ? 'bg-blue-50 border-blue-300 text-blue-600 font-bold'
                      : 'border-slate-200 text-slate-500'
                  }`}
                  onClick={() => setSelectedSeverity(sev)}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Inspection</th>
                  <th>Asset</th>
                  <th>Date</th>
                  <th>Findings</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td>
                      <b>{item.id}</b>
                      <small>{item.inspectionType} Survey</small>
                    </td>
                    <td>
                      <strong>{item.assetName}</strong>
                      <small>{item.assetType}</small>
                    </td>
                    <td>{item.date}</td>
                    <td>
                      <span className="finding-count">{item.findingsCount}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          item.overallSeverity === 'Severe'
                            ? 'badge-red'
                            : item.overallSeverity === 'Moderate'
                            ? 'badge-amber'
                            : 'badge-teal'
                        }`}
                      >
                        {item.overallSeverity}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status ${
                          item.status === 'Completed' ? 'complete' : 'review'
                        }`}
                      >
                        <i />
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-xs text-blue-600 hover:underline font-semibold"
                        onClick={() => onNavigate('Analysis Results', { inspectionId: item.id })}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Stack */}
        <div className="side-stack">
          <div className="panel attention-panel">
            <div className="panel-head">
              <div>
                <h2>Needs attention</h2>
                <p>Prioritized engineering review queue</p>
              </div>
            </div>

            <div className="space-y-2">
              {attentionList.map((item) => (
                <div
                  key={item.id}
                  className="attention-item cursor-pointer hover:bg-slate-50 p-2 rounded transition"
                  onClick={() =>
                    onNavigate('Analysis Results', { inspectionId: item.id })
                  }
                >
                  <div
                    className={`attention-icon ${
                      item.overallSeverity === 'Critical' || item.overallSeverity === 'Severe'
                        ? 'red'
                        : 'amber'
                    }`}
                  >
                    {item.overallSeverity === 'Critical' || item.overallSeverity === 'Severe' ? (
                      <AlertTriangle />
                    ) : (
                      <Clock3 />
                    )}
                  </div>
                  <div>
                    <strong>{item.assetName}</strong>
                    <p>
                      {item.id} · {item.overallSeverity} ({item.findingsCount || 1} defect findings)
                    </p>
                  </div>
                  <ArrowUpRight />
                </div>
              ))}
            </div>

            <button
              className="outline-button"
              onClick={() => onNavigate('Maintenance & Work Orders')}
            >
              Open work orders queue
            </button>
          </div>

          <div className="panel schedule-panel">
            <div className="panel-head">
              <div>
                <h2>Upcoming inspections</h2>
                <p>Scheduled monitoring calendar</p>
              </div>
              <CalendarDays />
            </div>

            {upcomingAssets.length > 0 ? upcomingAssets.map((asset) => {
              const dueDate = new Date(asset.nextScheduledInspection)
              return (
                <div className="schedule-row" key={asset.id}>
                  <div className="date-box">
                    <b>{dueDate.getDate()}</b>
                    <small>{new Intl.DateTimeFormat('en', { month: 'short' }).format(dueDate)}</small>
                  </div>
                  <div>
                    <strong>{asset.name}</strong>
                    <p>{asset.type} · {dueDate.toLocaleDateString()}</p>
                  </div>
                </div>
              )
            }) : (
              <p className="text-xs text-slate-500">No future inspection dates are recorded.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
