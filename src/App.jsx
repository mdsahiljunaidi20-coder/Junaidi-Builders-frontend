import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sites from './pages/Sites'
import SiteDetail from './pages/SiteDetail'
import Labours from './pages/Labours'
import Attendance from './pages/Attendance'
import Allocation from './pages/Allocation'
import Expenses from './pages/Expenses'
import Advances from './pages/Advances'
import Profile from './pages/Profile'

function AppLayout({ children }) {
    return (
        <div className="app-layout">
            {children}
            <BottomNav />
        </div>
    )
}

export default function App() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <ToastProvider>
            <Routes>
                {/* Public */}
                <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

                {/* Protected */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <AppLayout><Dashboard /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/sites" element={
                    <ProtectedRoute>
                        <AppLayout><Sites /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/sites/:siteId" element={
                    <ProtectedRoute>
                        <AppLayout><SiteDetail /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/labours" element={
                    <ProtectedRoute>
                        <AppLayout><Labours /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/sites/:siteId/labours" element={
                    <ProtectedRoute>
                        <AppLayout><Labours /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/sites/:siteId/advances/:labourId" element={
                    <ProtectedRoute>
                        <AppLayout><Advances /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/attendance" element={
                    <ProtectedRoute>
                        <AppLayout><Attendance /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/allocate" element={
                    <ProtectedRoute>
                        <AppLayout><Allocation /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/expenses" element={
                    <ProtectedRoute>
                        <AppLayout><Expenses /></AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <AppLayout><Profile /></AppLayout>
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ToastProvider>
    )
}
