const express = require('express')
const cors = require('cors')
const { readRoster, writeRoster, readSalesWeeks, writeSalesWeeks } = require('./storage')

const app = express()
app.use(cors())
app.use(express.json())

function sortByName(a, b) {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

function flattenSalesData(weeklySales) {
  return weeklySales.flatMap((week) => {
    if (!week || !Array.isArray(week.entries)) return []
    return week.entries.map((entry) => ({
      ...entry,
      weekId: week.weekId,
      saturdayDate: week.saturdayDate,
    }))
  })
}

function getWeekRecord(weeklySales, weekId) {
  return weeklySales.find((week) => week.weekId === weekId) || null
}

app.get('/api/roster', async (req, res) => {
  const data = await readRoster()
  data.sort(sortByName)
  res.json(data)
})

app.get('/', (req, res) => {
  res.send('Roster API running. Use GET /api/roster to list staff.')
})

app.post('/api/roster', async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' })
  const data = await readRoster()
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const entry = {
    id,
    name: name.trim(),
    salesExempt: Boolean(req.body.salesExempt),
    onLOA: false,
    promotable: false,
    attendanceStrikes: 0,
    targetExempt: false
  }
  data.push(entry)
  data.sort(sortByName)
  await writeRoster(data)
  res.status(201).json(entry)
})

app.delete('/api/roster/:id', async (req, res) => {
  const { id } = req.params
  const data = await readRoster()
  const idx = data.findIndex((s) => s.id === id)
  if (idx === -1) return res.status(404).json({ error: 'not found' })
  const removed = data.splice(idx, 1)[0]
  await writeRoster(data)
  res.json(removed)
})

app.patch('/api/roster/:id', async (req, res) => {
  const { id } = req.params
  const patch = req.body
  const data = await readRoster()
  const idx = data.findIndex((s) => s.id === id)
  if (idx === -1) return res.status(404).json({ error: 'not found' })
  const item = data[idx]
  const allowed = ['name', 'salesExempt', 'onLOA', 'promotable', 'attendanceStrikes', 'targetExempt']
  for (const key of Object.keys(patch)) {
    if (allowed.includes(key)) item[key] = patch[key]
  }
  data.sort(sortByName)
  await writeRoster(data)
  res.json(item)
})

app.get('/api/sales', async (req, res) => {
  const weeklySales = await readSalesWeeks()
  res.json(flattenSalesData(weeklySales))
})

app.get('/api/sales/:weekId', async (req, res) => {
  const { weekId } = req.params
  const weeklySales = await readSalesWeeks()
  const week = getWeekRecord(weeklySales, weekId)
  res.json(week ? week.entries : [])
})

app.post('/api/sales', async (req, res) => {
  const { staffId, staffName, weekId, saturdayDate, customersServed, salesAmount, timeClocked } = req.body
  if (!staffId || !weekId || !saturdayDate) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const sales = await readSalesWeeks()
  const roster = await readRoster()

  let weekRecord = getWeekRecord(sales, weekId)
  if (!weekRecord) {
    weekRecord = {
      weekId,
      saturdayDate,
      createdAt: new Date().toISOString(),
      entries: [],
    }
    sales.push(weekRecord)
  }

  const existing = weekRecord.entries.find((s) => s.staffId === staffId)
  if (existing) {
    return res.status(400).json({ error: 'Staff already has data for this week' })
  }

  const staff = roster.find((s) => s.id === staffId)
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' })
  }

  const hasStrike = salesAmount === 0 || timeClocked === 0
  const bonusEligible = salesAmount >= 25000
  const bonusAmount = bonusEligible ? Math.round(salesAmount * 0.1) : 0

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    staffId,
    staffName: staffName || staff.name,
    weekId,
    saturdayDate,
    customersServed: customersServed || 0,
    salesAmount: salesAmount || 0,
    timeClocked,
    strike: hasStrike,
    bonusEligible,
    bonusAmount,
    createdAt: new Date().toISOString()
  }

  weekRecord.entries.push(entry)
  await writeSalesWeeks(sales)

  if (hasStrike) {
    staff.attendanceStrikes += 1
    await writeRoster(roster)
  }

  res.status(201).json(entry)
})

app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params
  const sales = await readSalesWeeks()
  let removed = null
  let targetWeek = null

  for (const week of sales) {
    const idx = week.entries.findIndex((entry) => entry.id === id)
    if (idx !== -1) {
      removed = week.entries.splice(idx, 1)[0]
      targetWeek = week
      break
    }
  }

  if (!removed) return res.status(404).json({ error: 'not found' })

  if (removed.strike) {
    const roster = await readRoster()
    const staff = roster.find((s) => s.id === removed.staffId)
    if (staff && staff.attendanceStrikes > 0) {
      staff.attendanceStrikes -= 1
      await writeRoster(roster)
    }
  }

  if (targetWeek && targetWeek.entries.length === 0) {
    const emptyWeekIdx = sales.findIndex((week) => week.weekId === targetWeek.weekId)
    if (emptyWeekIdx !== -1) {
      sales.splice(emptyWeekIdx, 1)
    }
  }

  await writeSalesWeeks(sales)
  res.json(removed)
})

app.get('/api/report/:weekId', async (req, res) => {
  const { weekId } = req.params
  const sales = flattenSalesData(await readSalesWeeks())
  const roster = await readRoster()

  const weekSales = sales.filter((s) => s.weekId === weekId)
  const activeStaff = roster.filter((s) => !s.onLOA && !s.salesExempt)
  const needsData = activeStaff.filter((s) => !weekSales.find((w) => w.staffId === s.id))

  let report = `**Weekly Report - Week of ${weekId}**\n\n`

  if (needsData.length > 0) {
    report += `⚠️ **Still Need Data:**\n`
    needsData.forEach((s) => {
      report += `• ${s.name}\n`
    })
    report += '\n'
  }

  const strikeEntries = weekSales.filter((s) => s.strike)
  if (strikeEntries.length > 0) {
    report += `📍 **Attendance Strikes Added:**\n`
    strikeEntries.forEach((s) => {
      report += `• ${s.staffName} (0 sales or 0 time clocked)\n`
    })
    report += '\n'
  }

  const bonusEntries = weekSales.filter((s) => s.bonusEligible)
  if (bonusEntries.length > 0) {
    report += `🎉 **Bonus Eligible (≥$25,000 sales):**\n`
    bonusEntries.forEach((s) => {
      const sph = s.timeClocked > 0 ? (s.salesAmount / s.timeClocked).toFixed(2) : '0.00'
      report += `• ${s.staffName}: $${s.salesAmount.toLocaleString()} sales | $${s.bonusAmount.toLocaleString()} bonus (10%) | $${sph}/hr\n`
    })
    report += '\n'
  }

  report += `**All Sales This Week:**\n`
  weekSales.forEach((s) => {
    const sph = s.timeClocked > 0 ? (s.salesAmount / s.timeClocked).toFixed(2) : '0.00'
    const strike = s.strike ? ' ⚠️' : ''
    report += `• ${s.staffName}: $${s.salesAmount.toLocaleString()} | $${sph}/hr${strike}\n`
  })

  res.json({ report, needsData: needsData.map((s) => ({ id: s.id, name: s.name })), weekSales })
})

module.exports = app