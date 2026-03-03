import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function Advances() {
    const { siteId, labourId } = useParams()
    const [labour, setLabour] = useState(null)
    const [advances, setAdvances] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editAdvance, setEditAdvance] = useState(null)
    const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' })
    const [saving, setSaving] = useState(false)
    const { user } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()

    const hasFinancialAccess = ['admin', 'contractor', 'subcontractor'].includes(user?.role)

    useEffect(() => { loadData() }, [labourId])

    const loadData = async () => {
        try {
            const [labRes, advRes] = await Promise.all([
                api.get(`/labours/${labourId}`),
                api.get(`/advances?labour_id=${labourId}`),
            ])
            setLabour(labRes.data)
            setAdvances(advRes.data)
        } catch { toast('Failed to load', 'error') }
        finally { setLoading(false) }
    }

    const openCreate = () => {
        setEditAdvance(null)
        setForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '' })
        setShowModal(true)
    }

    const openEdit = (adv) => {
        setEditAdvance(adv)
        setForm({ amount: adv.amount, date: adv.date, note: adv.note || '' })
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form, amount: parseFloat(form.amount) }
            if (editAdvance) {
                await api.put(`/advances/${editAdvance.id}`, payload)
                toast('Advance updated!')
            } else {
                await api.post('/advances', { ...payload, labour_id: labourId })
                toast('Advance added!')
            }
            setShowModal(false)
            loadData()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to save', 'error')
        } finally { setSaving(false) }
    }

    const handleDelete = async (adv) => {
        if (!confirm('Delete this advance record?')) return
        try {
            await api.delete(`/advances/${adv.id}`)
            toast('Advance deleted')
            loadData()
        } catch { toast('Failed to delete', 'error') }
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
    const totalAdvances = advances.reduce((s, a) => s + (a.amount || 0), 0)

    if (loading) return <div className="page-content"><div className="loading"><div className="spinner"></div></div></div>

    return (
        <div className="page-content">
            <div className="page-header">
                <p className="text-muted fs-xs" style={{ cursor: 'pointer' }} onClick={() => navigate(siteId ? `/sites/${siteId}/labours` : '/labours')}>← Back to Labours</p>
                <div className="flex-between">
                    <div>
                        <h1>{labour?.name || 'Advances'}</h1>
                        <p>Advance payments</p>
                    </div>
                    {hasFinancialAccess && <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-advance-btn">+ Add</button>}
                </div>
            </div>

            {/* Summary */}
            {labour && (
                <div className="stat-grid mb-16" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-label">Security</div>
                        <div className="stat-value text-warning" style={{ fontSize: '1rem' }}>{fmt(labour.joining_fee)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Earned</div>
                        <div className="stat-value text-success" style={{ fontSize: '1rem' }}>{fmt(labour.total_earned)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Reg. Advances</div>
                        <div className="stat-value text-warning" style={{ fontSize: '1rem' }}>{fmt(totalAdvances - (labour.joining_fee || 0))}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Payable</div>
                        <div className={`stat-value ${labour.payable >= 0 ? 'text-accent' : 'text-danger'}`} style={{ fontSize: '1rem' }}>
                            {fmt(labour.payable)}
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {advances.length === 0 ? (
                <div className="empty-state">
                    <p>No advances paid yet.</p>
                    {hasFinancialAccess && <button className="btn btn-primary" onClick={openCreate}>Add Advance</button>}
                </div>
            ) : (
                advances.map((adv) => (
                    <div key={adv.id} className="list-item" id={`advance-${adv.id}`} style={adv.is_joining_fee ? { borderLeft: '4px solid var(--warning)' } : adv.is_settlement ? { borderLeft: '4px solid var(--success)' } : {}}>
                        <div className="list-item-info" onClick={() => !adv.is_joining_fee && openEdit(adv)} style={{ cursor: adv.is_joining_fee ? 'default' : 'pointer', flex: 1 }}>
                            <h3>
                                {fmt(adv.amount)}
                                {adv.is_joining_fee && <span className="badge badge-paused" style={{ marginLeft: 8, fontSize: '0.6rem' }}>SECURITY</span>}
                                {adv.is_settlement && <span className="badge badge-present" style={{ marginLeft: 8, fontSize: '0.6rem' }}>SETTLED</span>}
                            </h3>
                            <p>
                                {adv.date}
                                {adv.created_by_role && (
                                    <span
                                        className={`badge badge-${adv.created_by_role === 'subcontractor' ? 'paused' : 'present'}`}
                                        style={{ marginLeft: 8, fontSize: '0.6rem', textTransform: 'uppercase' }}
                                    >
                                        {adv.created_by_role === 'subcontractor' ? 'SUB' : adv.created_by_role}
                                    </span>
                                )}
                                {adv.created_by_name && <span className="text-muted" style={{ marginLeft: 8 }}>• {adv.created_by_name}</span>}
                                {adv.note ? ` • ${adv.note}` : ''}
                            </p>
                        </div>
                        {hasFinancialAccess && !adv.is_joining_fee && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(adv)} style={{ padding: '6px 8px', minWidth: 'auto' }}>🗑️</button>}
                    </div>
                ))
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editAdvance ? 'Edit Advance' : 'Add Advance'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Amount (₹) *</label>
                                <input className="form-input" type="number" min="0.01" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="1000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input className="form-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional note" />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                                {saving ? 'Saving...' : (editAdvance ? 'Update Advance' : 'Add Advance')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
