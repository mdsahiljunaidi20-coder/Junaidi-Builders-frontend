import { useState, useEffect } from 'react'
import api from '../api'
import { useToast } from '../components/Toast'

export default function Allocation() {
    const [sites, setSites] = useState([])
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [pool, setPool] = useState([])
    const [allocations, setAllocations] = useState({}) // { siteId: [labours] }
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    useEffect(() => {
        loadSites()
    }, [])

    useEffect(() => {
        loadData()
    }, [selectedDate])

    const loadSites = async () => {
        try {
            const res = await api.get('/sites')
            setSites(res.data)
        } catch { toast('Failed to load sites', 'error') }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            // 1. Load unassigned (pool) for this date
            const poolRes = await api.get(`/labours/unassigned?date=${selectedDate}`)
            setPool(poolRes.data)

            // 2. Load all allocations for this date
            const allocRes = await api.get(`/allocations?date=${selectedDate}`)

            // 3. Group allocations by site
            const grouped = {}
            for (const a of allocRes.data) {
                if (!grouped[a.site_id]) grouped[a.site_id] = []

                // Fetch labour details for these allocations
                // Optimization: In a real app, the API should return labour details joined
                const lab = await api.get(`/labours/${a.labour_id}`).catch(() => null)
                if (lab) {
                    grouped[a.site_id].push({ ...lab.data, allocation_id: a.id })
                }
            }
            setAllocations(grouped)
        } catch (err) {
            toast('Failed to load allocation data', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleAllocate = async (labourId, siteId) => {
        setSaving(true)
        try {
            await api.post('/allocations', {
                labour_id: labourId,
                site_id: siteId,
                date: selectedDate
            })
            toast('Worker allocated!')
            loadData()
        } catch (err) {
            toast(err.response?.data?.detail || 'Allocation failed', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleRemove = async (allocationId) => {
        if (!confirm('Remove this allocation?')) return
        setSaving(true)
        try {
            await api.delete(`/allocations/${allocationId}`)
            toast('Allocation removed')
            loadData()
        } catch {
            toast('Failed to remove allocation', 'error')
        } finally {
            setSaving(false)
        }
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Daily Allocation</h1>
                <p>Assign workers to sites for a specific day</p>
            </div>

            <div className="card mb-16">
                <div className="form-group mb-0">
                    <label className="form-label">Select Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <div className="allocation-layout">
                    {/* Pool Section */}
                    <div className="allocation-section">
                        <h2 className="section-title">📦 Labour Pool ({pool.length})</h2>
                        <div className="pool-grid">
                            {pool.length === 0 ? (
                                <p className="text-muted fs-xs italic">No unassigned workers for this day.</p>
                            ) : (
                                pool.map(l => (
                                    <div key={l.id} className="card p-12 mb-8">
                                        <div className="flex-between">
                                            <div>
                                                <h4 className="fw-600 fs-sm">{l.name}</h4>
                                                <p className="text-muted fs-xs">{l.skill} • {fmt(l.daily_wage)}</p>
                                            </div>
                                            <select
                                                className="form-select fs-xs"
                                                style={{ width: 'auto', padding: '4px 8px' }}
                                                onChange={(e) => handleAllocate(l.id, e.target.value)}
                                                defaultValue=""
                                                disabled={saving}
                                            >
                                                <option value="" disabled>Allot...</option>
                                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="divider-h mb-16 mt-16"></div>

                    {/* Sites Section */}
                    {sites.map(site => (
                        <div key={site.id} className="allocation-section mb-16">
                            <h3 className="fs-sm fw-700 text-muted mb-8" style={{ textTransform: 'uppercase' }}>
                                📍 {site.name} ({allocations[site.id]?.length || 0})
                            </h3>
                            <div className="allocated-grid">
                                {(allocations[site.id] || []).length === 0 ? (
                                    <p className="text-muted fs-xs italic mb-8">Empty</p>
                                ) : (
                                    allocations[site.id].map(l => (
                                        <div key={l.id} className="card p-12 mb-8" style={{ borderLeft: '3px solid var(--accent)' }}>
                                            <div className="flex-between">
                                                <div>
                                                    <h4 className="fw-600 fs-sm">{l.name}</h4>
                                                    <p className="text-muted fs-xs">{l.skill}</p>
                                                </div>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    style={{ padding: '2px 6px', fontSize: '10px' }}
                                                    onClick={() => handleRemove(l.allocation_id)}
                                                    disabled={saving}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
