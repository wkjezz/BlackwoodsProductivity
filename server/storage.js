const fs = require('fs').promises
const path = require('path')

let kv = null
try {
  kv = require('@vercel/kv').kv
} catch (error) {
  kv = null
}

const DATA_FILE = path.join(__dirname, 'data', 'roster.json')
const SALES_FILE = path.join(__dirname, 'data', 'sales.json')
const ROSTER_KEY = 'blackwoods:roster'
const SALES_KEY = 'blackwoods:sales'
const ROSTER_SEED = require('./data/roster.json')
const SALES_SEED = require('./data/sales.json')

function hasKvConfig() {
  return Boolean(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  )
}

function useRemoteStorage() {
  return Boolean(kv && process.env.VERCEL && hasKvConfig())
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    return fallback
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function readRoster() {
  if (useRemoteStorage()) {
    const data = await kv.get(ROSTER_KEY)
    if (Array.isArray(data)) return data
    await kv.set(ROSTER_KEY, ROSTER_SEED)
    return Array.isArray(ROSTER_SEED) ? ROSTER_SEED : []
  }

  return readJsonFile(DATA_FILE, ROSTER_SEED)
}

async function writeRoster(data) {
  if (useRemoteStorage()) {
    await kv.set(ROSTER_KEY, data)
    return
  }

  await writeJsonFile(DATA_FILE, data)
}

async function readSalesWeeks() {
  if (useRemoteStorage()) {
    const data = await kv.get(SALES_KEY)
    if (Array.isArray(data)) return data
    await kv.set(SALES_KEY, SALES_SEED)
    return Array.isArray(SALES_SEED) ? SALES_SEED : []
  }

  return readJsonFile(SALES_FILE, SALES_SEED)
}

async function writeSalesWeeks(data) {
  if (useRemoteStorage()) {
    await kv.set(SALES_KEY, data)
    return
  }

  await writeJsonFile(SALES_FILE, data)
}

module.exports = {
  readRoster,
  writeRoster,
  readSalesWeeks,
  writeSalesWeeks,
}