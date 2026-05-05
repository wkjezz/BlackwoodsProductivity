import React, { useState } from 'react'
import RosterManagement from './components/RosterManagement'
import SalesDataEntry from './components/SalesDataEntry'
import logo from './assets/BW_LOGO_WITH_THORNS.png'

export default function App() {
  const [showRoster, setShowRoster] = useState(false)
  const [showSales, setShowSales] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-bw">
      <div className="bg-[rgba(255,255,255,0.02)] p-8 rounded-lg shadow-md w-full max-w-2xl text-center border border-[rgba(255,255,255,0.03)]">
        <div className="flex flex-col items-center">
          <img src={logo} alt="BW logo" className="h-24 mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-cream">Blackwoods Productivity Tracker</h1>
        </div>

        {!showRoster && !showSales ? (
          <div className="mt-6 space-y-3">
            <button className="btn btn-primary w-full" onClick={() => setShowRoster(true)}>
              Roster Management
            </button>
            <button className="btn btn-primary w-full" onClick={() => setShowSales(true)}>
              Sales Data Entry
            </button>
          </div>
        ) : (
          <div className="mt-6 text-left">
            {showRoster && <RosterManagement onClose={() => setShowRoster(false)} />}
            {showSales && <SalesDataEntry onClose={() => setShowSales(false)} />}
          </div>
        )}

      </div>
    </div>
  )
}
