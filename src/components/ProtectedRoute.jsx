import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!user) return <Navigate to="/login" replace />

    if (role && user.role !== role) {
        return (
            <div className="page-content">
                <div className="empty-state">
                    <p>You don't have permission to access this page.</p>
                </div>
            </div>
        )
    }

    return children
}
