import React, { useEffect, useState } from 'react'

function Pill({ children, className = '' }) {
  return (
    <span className={"pill " + className}>
      {children}
    </span>
  )
}

export default function SalesDataEntry({ onClose }) {
  const [roster, setRoster] = useState([])
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Form state
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [saturdayDate, setSaturdayDate] = useState('')
  const [customersServed, setCustomersServed] = useState('')
  const [salesAmount, setSalesAmount] = useState('')
  const [timeDays, setTimeDays] = useState('0')
  const [timeHours, setTimeHours] = useState('0')
  const [timeMinutes, setTimeMinutes] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [report, setReport] = useState(null)

  async function fetchJson(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      return data
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async function fetchRoster() {
    try {
      const data = await fetchJson('/api/roster')
      setRoster(data)
    } catch (err) {
      setError(err.message || 'Unable to load roster data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSalesData() {
    try {
      const data = await fetchJson('/api/sales')
      setSalesData(data)
    } catch (e) {
      setError(e.message || 'Unable to load sales data')
    }
  }

  useEffect(() => {
    fetchRoster()
    fetchSalesData()
  }, [])

  function getSaturdayAnchor() {
    return '2020-01-04'
  }

  function getWeekRange(saturdayDateStr) {
    if (!saturdayDateStr) return ''
    const sat = new Date(saturdayDateStr)
    const fri = new Date(sat)
    fri.setDate(fri.getDate() + 6)
    
    const satFormatted = sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const friFormatted = fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${satFormatted} - ${friFormatted}`
  }

  // Get week ID (YYYY-WW format)
  function getWeekId(saturdayDateStr) {
    if (!saturdayDateStr) return ''
    const date = new Date(saturdayDateStr)
    const jan1 = new Date(date.getFullYear(), 0, 1)
    const diff = date - jan1
    const oneDay = 24 * 60 * 60 * 1000
    const dayOfYear = Math.floor(diff / oneDay)
    const weekNum = Math.floor(dayOfYear / 7) + 1
    return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
  }

  const saturdayForWeek = saturdayDate
  const weekId = saturdayForWeek ? getWeekId(saturdayForWeek) : ''

  // Get eligible staff (not LOA, not sales exempt)
  const eligibleStaff = roster.filter(s => !s.onLOA && !s.salesExempt)

  // Get staff who need data for this week
  const needsData = saturdayForWeek
    ? eligibleStaff.filter(s => !salesData.find(d => d.staffId === s.id && d.weekId === weekId))
    : []

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (!selectedStaffId || !saturdayForWeek) {
      setError('Please select a staff member and Saturday date')
      return
    }

    const totalMinutes = parseInt(timeDays) * 480 + parseInt(timeHours) * 60 + parseInt(timeMinutes)
    const timeInHours = totalMinutes / 60

    if (timeInHours === 0 && Number(salesAmount || 0) === 0) {
      setError('Sales or time clocked must be greater than 0')
      return
    }

    setSubmitting(true)
    try {
      const staff = roster.find(s => s.id === selectedStaffId)
      const payload = {
        staffId: selectedStaffId,
        staffName: staff.name,
        weekId,
        saturdayDate: saturdayForWeek,
        customersServed: Number(customersServed) || 0,
        salesAmount: Number(salesAmount) || 0,
        timeClocked: timeInHours,
      }

      await fetchJson('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setSelectedStaffId('')
      setSaturdayDate('')
      setCustomersServed('')
      setSalesAmount('')
      setTimeDays('0')
      setTimeHours('0')
      setTimeMinutes('0')
      
      fetchSalesData()
    } catch (e) {
      setError(e.message || 'Unable to save sales data')
    }
    setSubmitting(false)
  }

  async function generateReport() {
    if (!weekId) return
    try {
      const data = await fetchJson(`/api/report/${weekId}`)
      setReport(data)
    } catch (e) {
      setError(e.message || 'Unable to generate report')
    }
  }

  const allDataEntered = needsData.length === 0 && salesData.filter(d => d.weekId === weekId).length > 0

  return (
    <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-md border border-[rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-cream">Sales Data Entry</h2>
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>

      {error && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      {!report ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-cream-muted mb-2">Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full p-2 rounded bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-cream"
                >
                  <option value="">Select staff...</option>
                  {eligibleStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-cream-muted mb-2">Week Starting (Saturday)</label>
                <input
                  type="date"
                  value={saturdayDate}
                  min={getSaturdayAnchor()}
                  step={7}
                  onChange={(e) => setSaturdayDate(e.target.value)}
                  className="w-full p-2 rounded bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-cream"
                />
                {saturdayDate && (
                  <div className="text-xs text-cream-muted mt-2">
                    Week: {getWeekRange(saturdayDate)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-cream-muted mb-2">Customers Served</label>
                <input
                  type="number"
                  value={customersServed}
                  onChange={(e) => setCustomersServed(e.target.value)}
                  min="0"
                  className="w-full p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] text-cream"
                />
              </div>

              <div>
                <label className="block text-sm text-cream-muted mb-2">Sales ($)</label>
                <input
                  type="number"
                  value={salesAmount}
                  onChange={(e) => setSalesAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] text-cream"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-cream-muted mb-2">Time Clocked</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-cream-muted">Days</label>
                  <input
                    type="number"
                    value={timeDays}
                    onChange={(e) => setTimeDays(e.target.value)}
                    min="0"
                    className="w-full p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] text-cream text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-cream-muted">Hours</label>
                  <input
                    type="number"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    min="0"
                    max="24"
                    className="w-full p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] text-cream text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-cream-muted">Minutes</label>
                  <input
                    type="number"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    min="0"
                    max="59"
                    className="w-full p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] text-cream text-center"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Data'}
            </button>
          </form>

          {weekId && (
            <div className="space-y-4">
              {needsData.length > 0 && (
                <section className="space-y-3 rounded-lg border border-[rgba(245,165,158,0.25)] bg-[rgba(245,165,158,0.05)] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cream-muted">Still Need Data</h3>
                    <span className="pill bg-[rgba(245,165,158,0.18)] text-cream">{needsData.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {needsData.map(s => (
                      <li key={s.id} className="text-sm text-cream">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {allDataEntered && (
                <button
                  onClick={generateReport}
                  className="btn btn-primary w-full"
                >
                  Generate Report
                </button>
              )}

              {salesData.filter(d => d.weekId === weekId).length > 0 && (
                <section className="space-y-3 rounded-lg border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.05)] p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cream-muted">Entries for {weekId}</h3>
                  <ul className="space-y-2">
                    {salesData.filter(d => d.weekId === weekId).map(d => {
                      const sph = d.timeClocked > 0 ? (d.salesAmount / d.timeClocked).toFixed(2) : 'N/A'
                      return (
                        <li key={d.id} className="text-sm text-cream p-2 rounded bg-[rgba(255,255,255,0.01)]">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{d.staffName}</div>
                              <div className="text-xs text-cream-muted">
                                ${d.salesAmount.toLocaleString()} | {sph === 'N/A' ? 'No time' : `$${sph}/hr`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {d.strike && <Pill className="bg-red-600 text-white text-xs">⚠️ Strike</Pill>}
                              {d.bonusEligible && <Pill className="bg-yellow-600 text-white text-xs">💰 Bonus</Pill>}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setReport(null)}
            className="btn btn-outline w-full"
          >
            Back to Entry
          </button>
          <section className="rounded-lg border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.05)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cream-muted mb-4">Discord Report</h3>
            <pre className="text-xs text-cream bg-[rgba(0,0,0,0.3)] p-3 rounded overflow-auto whitespace-pre-wrap max-h-96">
              {report.report}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(report.report)
                setMessage('✓ Copied to clipboard')
              }}
              className="btn btn-primary mt-4 w-full"
            >
              Copy to Clipboard
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
