import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

export default function SiteDetail() {
    const { siteId } = useParams()
    const [site, setSite] = useState(null)
    const [pl, setPl] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => { loadData() }, [siteId])

    const loadData = async () => {
        try {
            const [siteRes, plRes] = await Promise.all([
                api.get(`/sites/${siteId}`),
                api.get(`/sites/${siteId}/profit-loss`),
            ])
            setSite(siteRes.data)
            setPl(plRes.data)
        } catch (err) {
            console.error(err)
        } finally { setLoading(false) }
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

    if (loading) return <div className="page-content"><div className="loading"><div className="spinner"></div></div></div>
    if (!site) return <div className="page-content"><div className="empty-state"><p>Site not found</p></div></div>

    const profitLoss = pl?.profit_loss || 0
    const isProfit = profitLoss >= 0

    return (
        <div className="page-content">
            <div className="page-header">
                <p className="text-muted fs-xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/sites')}>← Back to Sites</p>
                <h1>{site.name}</h1>
                {site.location && <p>📍 {site.location}</p>}
            </div>

            {/* P&L Summary */}
            <div className="card mb-16" style={{ background: isProfit ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                    <p className="text-muted fs-xs mb-4" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {isProfit ? 'Profit' : 'Loss'}
                    </p>
                    <p className={`fw-700 ${isProfit ? 'text-success' : 'text-danger'}`} style={{ fontSize: '2rem' }}>
                        {isProfit ? '+' : ''}{fmt(profitLoss)}
                    </p>
                </div>
            </div>

            {/* Detail Grid */}
            <div className="detail-grid mb-20">
                <div className="detail-item">
                    <div className="label">Contract Value</div>
                    <div className="value">{fmt(pl?.contract_value)}</div>
                </div>
                <div className="detail-item">
                    <div className="label">Total Cost</div>
                    <div className="value">{fmt(pl?.total_cost)}</div>
                </div>
                <div className="detail-item">
                    <div className="label">Labour Cost</div>
                    <div className="value text-warning">{fmt(pl?.labour_cost)}</div>
                </div>
                <div className="detail-item">
                    <div className="label">Expenses</div>
                    <div className="value text-danger">{fmt(pl?.total_expenses)}</div>
                </div>
                <div className="detail-item span-2">
                    <div className="label">Total Advances Paid</div>
                    <div className="value text-accent">{fmt(pl?.total_advances)}</div>
                </div>
            </div>

            {/* Cost bar */}
            <div className="mb-20">
                <div className="flex-between mb-4">
                    <span className="text-muted fs-xs">Cost Progress</span>
                    <span className="text-muted fs-xs">
                        {Math.round(((pl?.total_cost || 0) / (pl?.contract_value || 1)) * 100)}%
                    </span>
                </div>
                <div className="pl-bar" style={{ height: 8 }}>
                    <div
                        className={`pl-bar-fill ${isProfit ? 'profit' : 'loss'}`}
                        style={{ width: `${Math.min(((pl?.total_cost || 0) / (pl?.contract_value || 1)) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="fs-sm fw-700 text-muted mb-12" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick Actions
            </h2>

            <div className="list-item" onClick={() => navigate(`/sites/${siteId}/labours`)} id="goto-labours">
                <div className="list-item-info">
                    <h3>👷 Labours</h3>
                    <p>Manage workers & wages</p>
                </div>
                <span className="text-muted">→</span>
            </div>

            <div className="list-item" onClick={() => navigate(`/attendance?site=${siteId}`)} id="goto-attendance">
                <div className="list-item-info">
                    <h3>📋 Attendance</h3>
                    <p>Mark daily attendance</p>
                </div>
                <span className="text-muted">→</span>
            </div>

            <div className="list-item" onClick={() => navigate(`/expenses?site=${siteId}`)} id="goto-expenses">
                <div className="list-item-info">
                    <h3>💰 Expenses</h3>
                    <p>Track site expenses</p>
                </div>
                <span className="text-muted">→</span>
            </div>

            {site.client_name && (
                <div className="card mt-16">
                    <p className="text-muted fs-xs mb-4" style={{ textTransform: 'uppercase' }}>Client</p>
                    <p className="fw-600">{site.client_name}</p>
                </div>
            )}
        </div>
    )
}
