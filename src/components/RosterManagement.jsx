import React, { useEffect, useState } from 'react'

function Pill({ children, className = '' }) {
  return (
    <span className={"pill " + className}>
      {children}
    </span>
  )
}

export default function RosterManagement({ onClose }) {
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newSalesExempt, setNewSalesExempt] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})

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
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson('/api/roster')
      setRoster(data)
    } catch (err) {
      setError(err.message || 'Unable to load roster data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoster() }, [])

  async function addStaff(e) {
    e && e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      const payload = { name: newName, salesExempt: !!newSalesExempt }
      await fetchJson('/api/roster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setNewName('')
      setNewSalesExempt(false)
      fetchRoster()
    } catch (err) {
      setError(err.message || 'Unable to add staff')
    }
  }

  async function removeStaff(id) {
    if (!confirm('Remove staff?')) return
    setError('')
    try {
      await fetchJson(`/api/roster/${id}`, { method: 'DELETE' })
      fetchRoster()
    } catch (err) {
      setError(err.message || 'Unable to remove staff')
    }
  }

  async function patchStaff(id, patch) {
    setError('')
    try {
      await fetchJson(`/api/roster/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      fetchRoster()
    } catch (err) {
      setError(err.message || 'Unable to update staff')
    }
  }

  function sortedRoster() {
    return [...roster].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  }

  function groupedRoster() {
    const sorted = sortedRoster()
    const exempt = sorted.filter((staff) => staff.salesExempt)
    // Sort exempt: Ember Burns first, Colin Burns second, rest alphabetically
    exempt.sort((a, b) => {
      if (a.name === 'Ember Burns') return -1
      if (b.name === 'Ember Burns') return 1
      if (a.name === 'Colin Burns') return -1
      if (b.name === 'Colin Burns') return 1
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    })
    return {
      ownerManagerEvents: exempt.length > 0 ? exempt : [],
      loa: sorted.filter((staff) => staff.onLOA),
      active: sorted.filter((staff) => !staff.onLOA),
    }
  }

  const { ownerManagerEvents, loa, active } = groupedRoster()

  function renderStaffCard(s) {
    return (
      <li key={s.id} className={`grid grid-cols-[1fr_auto] items-center gap-4 p-3 rounded bg-[rgba(255,255,255,0.01)] ${s.attendanceStrikes >= 3 ? 'row-danger' : ''}`}>
        <div className="min-w-0">
          {editingId === s.id ? (
            <div className="flex gap-3 items-center">
              <input className="flex-1 p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]" value={editData.name} onChange={(e) => setEditData(d => ({...d, name: e.target.value}))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editData.salesExempt} onChange={(e) => setEditData(d => ({...d, salesExempt: e.target.checked}))} />
                <span className="text-cream-muted">Sales Exempt</span>
              </label>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <div className="font-medium text-cream truncate">{s.onLOA ? '📅 ' : ''}{s.name}</div>
              </div>
              <div className="mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {s.promotable && <Pill className="bg-cream text-bw">Promotable</Pill>}
                  {s.attendanceStrikes > 0 && (
                    <Pill className={s.attendanceStrikes >= 3 ? 'bg-red-600 text-bw' : 'bg-[#d97706] text-bw'}>Strikes: {s.attendanceStrikes}</Pill>
                  )}
                  {s.targetExempt && <Pill className="bg-cream-muted text-cream">Target Exempt</Pill>}
                  {s.onLOA && <Pill className="bg-[rgba(245,230,200,0.12)] text-cream">LOA</Pill>}
                  {s.salesExempt && <Pill className="bg-[rgba(245,230,200,0.12)] text-cream">Sales Exempt</Pill>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="action-group">
          {editingId === s.id ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => { patchStaff(s.id, { name: editData.name, salesExempt: !!editData.salesExempt }); setEditingId(null); setEditData({}) }}>Save</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(null); setEditData({}) }}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => patchStaff(s.id, { onLOA: !s.onLOA })}>
                {s.onLOA ? 'Remove LOA' : 'LOA'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(s.id); setEditData({ name: s.name, salesExempt: !!s.salesExempt }) }}>Edit</button>
              <button className="btn btn-outline btn-sm text-red-400" onClick={() => removeStaff(s.id)}>Delete</button>
            </>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-md border border-[rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-cream">Roster Management</h2>
        <div className="flex items-center gap-3">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <form onSubmit={addStaff} className="flex gap-3 items-center mb-4">
        <input className="w-2/5 p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newSalesExempt} onChange={(e) => setNewSalesExempt(e.target.checked)} />
          <span className="text-cream-muted">Sales Exempt</span>
        </label>
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {loading ? (
        <p className="text-cream-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          {sortedRoster().length === 0 && <p className="text-cream-muted">No staff yet.</p>}

          {ownerManagerEvents.length > 0 && (
            <section className="space-y-3 rounded-lg border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.06)] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cream-muted">Owner/Manager/Events</h3>
                <span className="pill bg-[rgba(255,215,0,0.18)] text-cream">{ownerManagerEvents.length}</span>
              </div>
              <ul className="space-y-3">
                {ownerManagerEvents.map((s) => renderStaffCard(s))}
              </ul>
            </section>
          )}

          {loa.length > 0 && (
            <section className="space-y-3 rounded-lg border border-[rgba(245,230,200,0.12)] bg-[rgba(245,230,200,0.04)] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cream-muted">LOA</h3>
                <span className="pill bg-[rgba(245,230,200,0.12)] text-cream">{loa.length}</span>
              </div>
              <ul className="space-y-3">
                {loa.map((s) => (
                  <li key={s.id} className={`grid grid-cols-[1fr_auto] items-center gap-4 p-3 rounded bg-[rgba(255,255,255,0.01)] ${s.attendanceStrikes >= 3 ? 'row-danger' : ''}`}>
                    <div className="min-w-0">
                      {editingId === s.id ? (
                        <div className="flex gap-3 items-center">
                          <input className="flex-1 p-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]" value={editData.name} onChange={(e) => setEditData(d => ({...d, name: e.target.value}))} />
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!editData.salesExempt} onChange={(e) => setEditData(d => ({...d, salesExempt: e.target.checked}))} />
                            <span className="text-cream-muted">Sales Exempt</span>
                          </label>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-4">
                            <div className="font-medium text-cream truncate">{s.onLOA ? '📅 ' : ''}{s.name}</div>
                          </div>
                          <div className="mt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {s.promotable && <Pill className="bg-cream text-bw">Promotable</Pill>}
                              {s.attendanceStrikes > 0 && (
                                <Pill className={s.attendanceStrikes >= 3 ? 'bg-red-600 text-bw' : 'bg-[#d97706] text-bw'}>Strikes: {s.attendanceStrikes}</Pill>
                              )}
                              {s.targetExempt && <Pill className="bg-cream-muted text-cream">Target Exempt</Pill>}
                              {s.onLOA && <Pill className="bg-[rgba(245,230,200,0.12)] text-cream">LOA</Pill>}
                              {s.salesExempt && <Pill className="bg-[rgba(245,230,200,0.12)] text-cream">Sales Exempt</Pill>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="action-group">
                      {editingId === s.id ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => { patchStaff(s.id, { name: editData.name, salesExempt: !!editData.salesExempt }); setEditingId(null); setEditData({}) }}>Save</button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(null); setEditData({}) }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => patchStaff(s.id, { onLOA: !s.onLOA })}>
                            {s.onLOA ? 'Remove LOA' : 'LOA'}
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(s.id); setEditData({ name: s.name, salesExempt: !!s.salesExempt }) }}>Edit</button>
                          <button className="btn btn-outline btn-sm text-red-400" onClick={() => removeStaff(s.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}



          {active.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cream-muted">Active</h3>
              <ul className="space-y-3">
                {active.filter((s) => !ownerManagerEvents.map(o => o.id).includes(s.id)).map((s) => renderStaffCard(s))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
