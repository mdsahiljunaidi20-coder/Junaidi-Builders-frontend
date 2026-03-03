import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function Labours() {
    const { siteId } = useParams()
    const [searchParams] = useSearchParams()
    const [labours, setLabours] = useState([])
    const [sites, setSites] = useState([])
    const [selectedSite, setSelectedSite] = useState(siteId || searchParams.get('site') || '')
    const [site, setSite] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showSettleModal, setShowSettleModal] = useState(false)
    const [editLabour, setEditLabour] = useState(null)
    const [settleLabour, setSettleLabour] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', skill: 'General', daily_wage: '', joining_fee: '' })
    const [settleForm, setSettleForm] = useState({ amount: '', note: 'Weekly Settlement' })

    const { user } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()
    const isContractor = user?.role === 'contractor' || user?.role === 'admin'
    const isSubcontractor = user?.role === 'subcontractor'
    const hasFinancialAccess = isContractor || isSubcontractor
    const isStandalone = !siteId

    useEffect(() => {
        loadData()
    }, [siteId, selectedSite])

    const loadData = async () => {
        setLoading(true)
        try {
            const effectiveSiteId = siteId || (selectedSite !== 'all' && selectedSite !== 'unassigned' ? selectedSite : '')
            const labUrl = selectedSite === 'unassigned' ? '/labours?site_id=unassigned' : (effectiveSiteId ? `/labours?site_id=${effectiveSiteId}` : '/labours')
            const labRes = await api.get(labUrl)
            setLabours(labRes.data)

            const siteRes = await api.get('/sites')
            setSites(siteRes.data)

            if (siteId) {
                const s = siteRes.data.find(s => s.id === siteId)
                setSite(s || null)
            }
        } catch { toast('Failed to load', 'error') }
        finally { setLoading(false) }
    }

    const openCreate = () => {
        setEditLabour(null)
        setForm({ name: '', phone: '', skill: 'General', daily_wage: '', joining_fee: '' })
        setShowModal(true)
    }

    const openEdit = (labour, e) => {
        e.stopPropagation()
        setEditLabour(labour)
        setForm({
            name: labour.name,
            phone: labour.phone || '',
            skill: labour.skill || 'General',
            daily_wage: labour.daily_wage,
            joining_fee: labour.joining_fee || '',
        })
        setShowModal(true)
    }

    const openSettle = (labour, e) => {
        e.stopPropagation()
        setSettleLabour(labour)
        setSettleForm({ amount: labour.payable, note: 'Advance' })
        setShowSettleModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                ...form,
                daily_wage: parseFloat(form.daily_wage),
                joining_fee: parseFloat(form.joining_fee || 0)
            }
            if (editLabour) {
                await api.put(`/labours/${editLabour.id}`, payload)
                toast('Labour updated!')
            } else {
                await api.post('/labours', payload)
                toast('Labour added!')
            }
            setShowModal(false)
            loadData()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to save', 'error')
        } finally { setSaving(false) }
    }

    const handleSettleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const amount = parseFloat(settleForm.amount)
            if (amount <= 0) {
                toast('Amount must be greater than zero', 'error')
                return
            }
            await api.post('/advances', {
                labour_id: settleLabour.id,
                amount: amount,
                date: new Date().toISOString().split('T')[0],
                note: settleForm.note,
                is_settlement: amount === settleLabour.payable
            })
            toast('Payment recorded!')
            setShowSettleModal(false)
            loadData()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to settle', 'error')
        } finally { setSaving(false) }
    }

    const handleDelete = async (labour, e) => {
        e.stopPropagation()
        if (!confirm(`Delete "${labour.name}" and their attendance/advance records?`)) return
        try {
            await api.delete(`/labours/${labour.id}`)
            toast('Labour deleted')
            loadData()
        } catch { toast('Failed to delete', 'error') }
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

    const filteredLabours = labours.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.skill || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="page-content"><div className="loading"><div className="spinner"></div></div></div>

    return (
        <div className="page-content">
            <div className="page-header">
                {!isStandalone && (
                    <p className="text-muted fs-xs" style={{ cursor: 'pointer' }} onClick={() => navigate(`/sites/${siteId}`)}>← Back to {site?.name || 'Site'}</p>
                )}
                <div className="flex-between">
                    <div>
                        <h1>Labours</h1>
                        <p>{labours.length} worker{labours.length !== 1 ? 's' : ''}</p>
                    </div>
                    {hasFinancialAccess && <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-labour-btn">+ Add</button>}
                </div>
            </div>

            <div className="card mb-16">
                <input
                    className="form-input"
                    placeholder="Search by name or skill..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isStandalone && (
                <div className="card mb-16">
                    <label className="form-label">Filter by Site</label>
                    <select className="form-select" value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
                        <option value="all">All Sites</option>
                        <option value="unassigned">⚠️ Pool (Unassigned)</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}

            {filteredLabours.length === 0 ? (
                <div className="empty-state">
                    <p>{searchTerm ? 'No workers match your search.' : 'No workers found.'}</p>
                    {hasFinancialAccess && !searchTerm && <button className="btn btn-primary" onClick={openCreate}>Add Labour</button>}
                </div>
            ) : (
                filteredLabours.map((l) => (
                    <div key={l.id} className="card mb-12">
                        <div className="flex-between mb-8">
                            <div>
                                <h3 className="fw-600">
                                    {l.name}
                                    {!l.site_id && <span className="badge badge-paused" style={{ marginLeft: 8 }}>POOL</span>}
                                </h3>
                                <p className="text-muted fs-xs">{l.skill} • {fmt(l.daily_wage)}/day</p>
                            </div>
                            {hasFinancialAccess && (
                                <div className="flex-gap">
                                    <button className="btn btn-primary btn-sm" onClick={(e) => openSettle(l, e)}>💸 Advance / Pay</button>
                                    <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(l, e)}>✏️</button>
                                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(l, e)}>🗑️</button>
                                </div>
                            )}
                        </div>

                        <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            <div className="detail-item" style={{ padding: 10 }}>
                                <div className="label" style={{ fontSize: '0.6rem' }}>Joining</div>
                                <div className="value text-warning" style={{ fontSize: '0.9rem' }}>{fmt(l.joining_fee)}</div>
                            </div>
                            <div className="detail-item" style={{ padding: 10 }}>
                                <div className="label" style={{ fontSize: '0.6rem' }}>Earned</div>
                                <div className="value text-success" style={{ fontSize: '0.9rem' }}>{fmt(l.total_earned)}</div>
                            </div>
                            <div className="detail-item" style={{ padding: 10 }}>
                                <div className="label" style={{ fontSize: '0.6rem' }}>Advances</div>
                                <div className="value text-warning" style={{ fontSize: '0.9rem' }}>{fmt(l.total_advances)}</div>
                            </div>
                            <div className="detail-item" style={{ padding: 10, cursor: 'pointer' }} onClick={() => navigate(`/labours/${l.id}/advances`)}>
                                <div className="label" style={{ fontSize: '0.6rem' }}>Payable</div>
                                <div className={`value ${l.payable >= 0 ? 'text-accent' : 'text-danger'}`} style={{ fontSize: '0.9rem' }}>{fmt(l.payable)}</div>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editLabour ? 'Edit Labour' : 'Add Labour'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Skill</label>
                                <input className="form-input" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Daily Wage *</label>
                                <input className="form-input" type="number" value={form.daily_wage} onChange={(e) => setForm({ ...form, daily_wage: e.target.value })} required />
                            </div>
                            {!editLabour && (
                                <div className="form-group">
                                    <label className="form-label">Joining Fee (Security) *</label>
                                    <input className="form-input" type="number" value={form.joining_fee} onChange={(e) => setForm({ ...form, joining_fee: e.target.value })} required />
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                                {saving ? 'Saving...' : (editLabour ? 'Update' : 'Add Labour')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Settlement Modal */}
            {showSettleModal && (
                <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Advance / Settle: {settleLabour?.name}</h2>
                            <button className="modal-close" onClick={() => setShowSettleModal(false)}>✕</button>
                        </div>
                        <div className="mb-16">
                            <div className="stat-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="stat-card" style={{ padding: '12px', borderLeft: '4px solid var(--accent)' }}>
                                    <div className="stat-label">Current Unpaid Balance</div>
                                    <div className="stat-value text-accent">{fmt(settleLabour?.payable)}</div>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleSettleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Payment / Advance Amount (₹) *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="any"
                                    value={settleForm.amount}
                                    onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value, note: e.target.value === settleLabour?.payable?.toString() ? 'Weekly Settlement' : 'Advance' })}
                                    required
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setSettleForm({ ...settleForm, amount: settleLabour?.payable, note: 'Weekly Settlement' })}
                                        style={{ flex: 1 }}
                                    >
                                        Settle Full Balance (Pay All)
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input
                                    className="form-input"
                                    value={settleForm.note}
                                    onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
                                    placeholder="e.g. Weekly Payment, Mid-week advance"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                                {saving ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
