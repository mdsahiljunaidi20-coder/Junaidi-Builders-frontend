import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function Sites() {
    const [sites, setSites] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editSite, setEditSite] = useState(null)
    const [form, setForm] = useState({ name: '', location: '', contract_value: '', client_name: '', status: 'active' })
    const [saving, setSaving] = useState(false)
    const { user } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()
    const isContractor = user?.role === 'contractor'

    useEffect(() => { loadSites() }, [])

    const loadSites = async () => {
        try {
            const res = await api.get('/sites')
            setSites(res.data)
        } catch { toast('Failed to load sites', 'error') }
        finally { setLoading(false) }
    }

    const openCreate = () => {
        setEditSite(null)
        setForm({ name: '', location: '', contract_value: '', client_name: '', status: 'active' })
        setShowModal(true)
    }

    const openEdit = (site, e) => {
        e.stopPropagation()
        setEditSite(site)
        setForm({
            name: site.name,
            location: site.location || '',
            contract_value: site.contract_value,
            client_name: site.client_name || '',
            status: site.status,
        })
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form, contract_value: parseFloat(form.contract_value) }
            if (editSite) {
                await api.put(`/sites/${editSite.id}`, payload)
                toast('Site updated!')
            } else {
                await api.post('/sites', payload)
                toast('Site created!')
            }
            setShowModal(false)
            loadSites()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to save site', 'error')
        } finally { setSaving(false) }
    }

    const handleDelete = async (site, e) => {
        e.stopPropagation()
        if (!confirm(`Delete "${site.name}" and all its data?`)) return
        try {
            await api.delete(`/sites/${site.id}`)
            toast('Site deleted')
            loadSites()
        } catch { toast('Failed to delete', 'error') }
    }

    if (loading) return <div className="page-content"><div className="loading"><div className="spinner"></div></div></div>

    return (
        <div className="page-content">
            <div className="page-header flex-between">
                <div>
                    <h1>Sites</h1>
                    <p>{sites.length} site{sites.length !== 1 ? 's' : ''}</p>
                </div>
                {isContractor && (
                    <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-site-btn">+ Add</button>
                )}
            </div>

            {sites.length === 0 ? (
                <div className="empty-state">
                    <p>No sites yet.</p>
                    {isContractor && <button className="btn btn-primary" onClick={openCreate}>Create First Site</button>}
                </div>
            ) : (
                sites.map((site) => (
                    <div
                        key={site.id}
                        className="list-item"
                        onClick={() => navigate(`/sites/${site.id}`)}
                        id={`site-${site.id}`}
                    >
                        <div className="list-item-info">
                            <h3>{site.name}</h3>
                            <p>{site.location || site.client_name || 'No details'}</p>
                        </div>
                        <div className="flex-gap" style={{ alignItems: 'center' }}>
                            <span className={`badge badge-${site.status}`}>{site.status}</span>
                            {isContractor && (
                                <>
                                    <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(site, e)}>✏️</button>
                                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(site, e)}>🗑️</button>
                                </>
                            )}
                        </div>
                    </div>
                ))
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editSite ? 'Edit Site' : 'New Site'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Site Name *</label>
                                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} placeholder="e.g. Green Valley Phase 2" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Sector 22, Islamabad" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contract Value (₹) *</label>
                                <input className="form-input" type="number" min="0" step="any" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} required placeholder="500000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Client Name</label>
                                <input className="form-input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. Ahmed Khan" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="paused">Paused</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                                {saving ? 'Saving...' : (editSite ? 'Update Site' : 'Create Site')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
