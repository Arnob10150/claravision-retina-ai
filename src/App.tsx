import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Analyze } from '@/pages/Analyze'
import { ScanDetail } from '@/pages/ScanDetail'
import { Patients } from '@/pages/Patients'
import { Scans } from '@/pages/Scans'
import { Reports } from '@/pages/Reports'
import { ReviewQueue } from '@/pages/ReviewQueue'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'
import { Admin } from '@/pages/Admin'
import { RiskCalculator } from '@/pages/RiskCalculator'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/scans/:id" element={<ScanDetail />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/review-queue" element={<ReviewQueue />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/risk-calculator" element={<RiskCalculator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
