import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import { useToast } from '../components/Toast'

export default function Expenses() {
    const [searchParams] = useSearchParams()
    const [sites, setSites] = useState([])
    const [selectedSite, setSelectedSite] = useState(searchParams.get('site') || '')
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editExpense, setEditExpense] = useState(null)
    const [form, setForm] = useState({ description: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0] })
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    useEffect(() => {
        api.get('/sites').then(res => {
            setSites(res.data)
            if (!selectedSite && res.data.length > 0) setSelectedSite(res.data[0].id)
        })
    }, [])

    useEffect(() => {
        if (selectedSite) loadExpenses()
    }, [selectedSite])

    const loadExpenses = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/expenses?site_id=${selectedSite}`)
            setExpenses(res.data)
        } catch { toast('Failed to load expenses', 'error') }
        finally { setLoading(false) }
    }

    const openCreate = () => {
        setEditExpense(null)
        setForm({ description: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0] })
        setShowModal(true)
    }

    const openEdit = (exp) => {
        setEditExpense(exp)
        setForm({ description: exp.description, amount: exp.amount, category: exp.category || 'General', date: exp.date })
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form, amount: parseFloat(form.amount) }
            if (editExpense) {
                await api.put(`/expenses/${editExpense.id}`, payload)
                toast('Expense updated!')
            } else {
                await api.post('/expenses', { ...payload, site_id: selectedSite })
                toast('Expense added!')
            }
            setShowModal(false)
            loadExpenses()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to save', 'error')
        } finally { setSaving(false) }
    }

    const handleDelete = async (exp) => {
        if (!confirm(`Delete expense "${exp.description}"?`)) return
        try {
            await api.delete(`/expenses/${exp.id}`)
            toast('Expense deleted')
            loadExpenses()
        } catch { toast('Failed to delete', 'error') }
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)

    const categories = ['General', 'Material', 'Transport', 'Equipment', 'Food', 'Fuel', 'Misc']

    return (
        <div className="page-content">
            <div className="page-header flex-between">
                <div>
                    <h1>Expenses</h1>
                    <p>Track site expenses</p>
                </div>
                {selectedSite && <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-expense-btn">+ Add</button>}
            </div>

            {/* Site selector */}
            <div className="form-group mb-16">
                <select className="form-select" value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} id="expense-site-select">
                    <option value="">Select a site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* Total */}
            {expenses.length > 0 && (
                <div className="card mb-16" style={{ textAlign: 'center' }}>
                    <p className="text-muted fs-xs mb-4" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Expenses</p>
                    <p className="fw-700 text-danger" style={{ fontSize: '1.5rem' }}>{fmt(totalExpenses)}</p>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : !selectedSite ? (
                <div className="empty-state"><p>Select a site to view expenses</p></div>
            ) : expenses.length === 0 ? (
                <div className="empty-state">
                    <p>No expenses recorded yet.</p>
                    <button className="btn btn-primary" onClick={openCreate}>Add Expense</button>
                </div>
            ) : (
                expenses.map((exp) => (
                    <div key={exp.id} className="list-item" id={`expense-${exp.id}`}>
                        <div className="list-item-info" onClick={() => openEdit(exp)} style={{ cursor: 'pointer', flex: 1 }}>
                            <h3>{exp.description}</h3>
                            <p>{exp.category || 'General'} • {exp.date}</p>
                        </div>
                        <div className="list-item-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div>
                                <div className="amount text-danger">{fmt(exp.amount)}</div>
                            </div>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp)} style={{ padding: '6px 8px', minWidth: 'auto' }}>🗑️</button>
                        </div>
                    </div>
                ))
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editExpense ? 'Edit Expense' : 'Add Expense'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Description *</label>
                                <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={2} placeholder="e.g. Cement purchase" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount (₹) *</label>
                                <input className="form-input" type="number" min="0.01" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="5000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                                {saving ? 'Saving...' : (editExpense ? 'Update Expense' : 'Add Expense')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
