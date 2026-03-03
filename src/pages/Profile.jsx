import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useToast } from '../components/Toast'

const ROLE_LABELS = {
    admin: 'Admin',
    contractor: 'Contractor',
    subcontractor: 'Subcontractor',
}

const CREATES_ROLE = {
    admin: 'Contractor',
    contractor: 'Subcontractor',
}

export default function Profile() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    const [managedUsers, setManagedUsers] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [saving, setSaving] = useState(false)

    const canCreateUsers = user?.role === 'admin' || user?.role === 'contractor'
    const childRole = CREATES_ROLE[user?.role] || null

    useEffect(() => {
        if (canCreateUsers) loadManagedUsers()
    }, [])

    const loadManagedUsers = async () => {
        setLoadingUsers(true)
        try {
            const res = await api.get('/users/managed')
            setManagedUsers(res.data)
        } catch { /* ignore */ }
        finally { setLoadingUsers(false) }
    }

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    const handleCreateUser = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await api.post('/users/create', form)
            toast(res.data.message || `${childRole} created!`)
            setForm({ name: '', email: '', password: '' })
            setShowModal(false)
            loadManagedUsers()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to create user', 'error')
        } finally { setSaving(false) }
    }

    const handleDeleteUser = async (u) => {
        if (!confirm(`Delete ${u.name} (${u.email})?`)) return
        try {
            await api.delete(`/users/${u.id}`)
            toast('User deleted')
            loadManagedUsers()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to delete', 'error')
        }
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Profile</h1>
                <p>Your account details</p>
            </div>

            {/* Profile Card */}
            <div className="card mb-16">
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: user?.role === 'admin'
                            ? 'linear-gradient(135deg, #ef4444, #f97316)'
                            : user?.role === 'contractor'
                                ? 'linear-gradient(135deg, var(--accent), #8b5cf6)'
                                : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        color: 'white',
                    }}>
                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.name}</h2>
                    <p className="text-muted fs-sm mt-8">{user?.email}</p>
                    <span className={`badge badge-${user?.role === 'admin' ? 'paused' : user?.role === 'contractor' ? 'active' : 'completed'}`} style={{ marginTop: 8 }}>
                        {ROLE_LABELS[user?.role] || user?.role}
                    </span>
                </div>
            </div>

            {/* Manage Users Section */}
            {canCreateUsers && (
                <>
                    <div className="flex-between mb-12">
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Manage {childRole}s</h2>
                            <p className="text-muted fs-xs">{managedUsers.length} account{managedUsers.length !== 1 ? 's' : ''} created by you</p>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} id="create-user-btn">
                            + Create {childRole}
                        </button>
                    </div>

                    {loadingUsers ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : managedUsers.length === 0 ? (
                        <div className="card mb-16" style={{ textAlign: 'center', padding: 24 }}>
                            <p className="text-muted">No {childRole?.toLowerCase()}s created yet.</p>
                            <button className="btn btn-primary mt-12" onClick={() => setShowModal(true)}>
                                Create First {childRole}
                            </button>
                        </div>
                    ) : (
                        managedUsers.map(u => (
                            <div key={u.id} className="card mb-12">
                                <div className="flex-between">
                                    <div>
                                        <h3 className="fw-600">{u.name}</h3>
                                        <p className="text-muted fs-xs">{u.email}</p>
                                        <span className={`badge badge-${u.role === 'contractor' ? 'active' : 'completed'}`} style={{ marginTop: 4, fontSize: '0.6rem' }}>
                                            {ROLE_LABELS[u.role] || u.role}
                                        </span>
                                    </div>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u)}>🗑️</button>
                                </div>
                            </div>
                        ))
                    )}
                </>
            )}

            {/* Logout */}
            <button className="btn btn-danger btn-block mt-16" onClick={handleLogout} id="logout-btn">
                Sign Out
            </button>

            {/* Create User Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create {childRole}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input
                                    className="form-input"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    minLength={2}
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    minLength={6}
                                    placeholder="Min 6 characters"
                                />
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 8, marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                ℹ️ This account will be created as <strong style={{ color: 'var(--accent)' }}>{childRole}</strong>
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                                {saving ? 'Creating...' : `Create ${childRole}`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
