import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import RiderDashboard from './pages/RiderDashboard'
import AddIncome from './pages/AddIncome'
import SubmitContribution from './pages/SubmitContribution'
import AdminDashboard from './pages/AdminDashboard'
import CooperativeMembers from './pages/CooperativeMembers'
import PrivacyPolicy from './pages/PrivacyPolicy'
import EndUserLicenseAgreement from './pages/EndUserLicenseAgreement'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/eula" element={<EndUserLicenseAgreement />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/rider" element={<RiderDashboard />} />
      <Route path="/rider/add-income" element={<AddIncome />} />
      <Route path="/rider/submit-contribution" element={<SubmitContribution />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/cooperative/:id" element={<CooperativeMembers />} />
    </Routes>
  )
}

export default App
