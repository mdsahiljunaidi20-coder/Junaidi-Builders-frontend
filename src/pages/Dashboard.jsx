import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
    const [sites, setSites] = useState([])
    const [plData, setPlData] = useState({})
    const [allocCount, setAllocCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const res = await api.get('/sites')
            setSites(res.data)
            const plMap = {}
            await Promise.all(
                res.data.map(async (site) => {
                    try {
                        const plRes = await api.get(`/sites/${site.id}/profit-loss`)
                        plMap[site.id] = plRes.data
                    } catch { /* skip */ }
                })
            )
            setPlData(plMap)

            // Get allocation count for today
            const today = new Date().toISOString().split('T')[0]
            const allocRes = await api.get(`/allocations?date=${today}`)
            setAllocCount(allocRes.data.length)
        } catch (err) {
            console.error('Failed to load dashboard', err)
        } finally {
            setLoading(false)
        }
    }

    const totalContract = Object.values(plData).reduce((s, p) => s + (p.contract_value || 0), 0)
    const totalCost = Object.values(plData).reduce((s, p) => s + (p.total_cost || 0), 0)
    const totalPL = Object.values(plData).reduce((s, p) => s + (p.profit_loss || 0), 0)
    const totalLabour = Object.values(plData).reduce((s, p) => s + (p.labour_cost || 0), 0)

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

    if (loading) return <div className="page-content"><div className="loading"><div className="spinner"></div></div></div>

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back, {user?.name} 👋</p>
            </div>

            {/* Summary Stats */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card neutral">
                    <div className="stat-label">Contract Value</div>
                    <div className="stat-value">{fmt(totalContract)}</div>
                </div>
                <div className="stat-card accent">
                    <div className="stat-label">Total Cost</div>
                    <div className="stat-value">{fmt(totalCost)}</div>
                </div>
                <div className="stat-card neutral">
                    <div className="stat-label">Allocated Today</div>
                    <div className="stat-value text-accent">{allocCount}</div>
                </div>
                <div className="stat-card neutral">
                    <div className="stat-label">Labour Cost</div>
                    <div className="stat-value">{fmt(totalLabour)}</div>
                </div>
                <div className={`stat-card ${totalPL >= 0 ? 'profit' : 'loss'}`}>
                    <div className="stat-label">Net P&L</div>
                    <div className="stat-value">{fmt(totalPL)}</div>
                </div>
            </div>

            {/* Sites P&L cards */}
            <h2 className="fs-sm fw-700 text-muted mb-12" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Sites ({sites.length})
            </h2>

            {sites.length === 0 ? (
                <div className="empty-state">
                    <p>No sites yet. Create your first site to get started!</p>
                    <button className="btn btn-primary" onClick={() => navigate('/sites')}>Add Site</button>
                </div>
            ) : (
                sites.map((site) => {
                    const pl = plData[site.id]
                    const profitLoss = pl?.profit_loss || 0
                    const contractValue = pl?.contract_value || 1
                    const costPercent = Math.min(((pl?.total_cost || 0) / contractValue) * 100, 100)

                    return (
                        <div
                            key={site.id}
                            className="card card-clickable mb-12"
                            onClick={() => navigate(`/sites/${site.id}`)}
                            id={`site-card-${site.id}`}
                        >
                            <div className="flex-between mb-8">
                                <h3 className="fw-600">{site.name}</h3>
                                <span className={`badge badge-${site.status}`}>{site.status}</span>
                            </div>

                            {site.location && (
                                <p className="text-muted fs-xs mb-8">📍 {site.location}</p>
                            )}

                            <div className="flex-between mb-4">
                                <span className="text-muted fs-xs">Contract: {fmt(pl?.contract_value)}</span>
                                <span className={`fw-700 fs-sm ${profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {profitLoss >= 0 ? '+' : ''}{fmt(profitLoss)}
                                </span>
                            </div>

                            <div className="pl-bar">
                                <div
                                    className={`pl-bar-fill ${profitLoss >= 0 ? 'profit' : 'loss'}`}
                                    style={{ width: `${costPercent}%` }}
                                ></div>
                            </div>

                            <div className="flex-between mt-8">
                                <span className="text-muted fs-xs">Labour: {fmt(pl?.labour_cost)}</span>
                                <span className="text-muted fs-xs">Expenses: {fmt(pl?.total_expenses)}</span>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
