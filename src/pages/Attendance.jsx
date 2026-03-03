import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import { useToast } from '../components/Toast'

export default function Attendance() {
    const [searchParams] = useSearchParams()
    const [sites, setSites] = useState([])
    const [selectedSite, setSelectedSite] = useState(searchParams.get('site') || 'all')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [labours, setLabours] = useState([])
    const [statuses, setStatuses] = useState({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    useEffect(() => {
        api.get('/sites').then(res => {
            setSites(res.data)
        })
    }, [])

    useEffect(() => {
        loadLaboursAndAttendance()
    }, [selectedSite, selectedDate])

    const loadLaboursAndAttendance = async () => {
        setLoading(true)
        try {
            // 1. Fetch ALLOCATIONS for this site and date
            const allocUrl = selectedSite === 'all'
                ? `/allocations?date=${selectedDate}`
                : `/allocations?site_id=${selectedSite}&date=${selectedDate}`
            const allocRes = await api.get(allocUrl)

            // 2. Fetch labour details for these allocations
            const labourDetails = await Promise.all(
                allocRes.data.map(async (a) => {
                    const lab = await api.get(`/labours/${a.labour_id}`).catch(() => null)
                    return lab ? { ...lab.data, site_id: a.site_id } : null
                })
            )
            const validLabours = labourDetails.filter(l => l !== null)

            // 3. Fetch attendance records for this date
            const attUrl = selectedSite === 'all'
                ? `/attendance?date=${selectedDate}`
                : `/attendance?site_id=${selectedSite}&date=${selectedDate}`
            const attRes = await api.get(attUrl)
            const allAttendance = attRes.data

            setLabours(validLabours)

            // 4. Pre-fill statuses from existing records
            const statusMap = {}
            validLabours.forEach(l => {
                const existing = allAttendance.find(a => a.labour_id === l.id)
                statusMap[l.id] = existing ? existing.status : 'present'
            })
            setStatuses(statusMap)
        } catch { toast('Failed to load attendance data', 'error') }
        finally { setLoading(false) }
    }

    const setStatus = (labourId, status) => {
        setStatuses({ ...statuses, [labourId]: status })
    }

    const handleSubmit = async () => {
        if (labours.length === 0) return
        setSaving(true)
        try {
            if (selectedSite === 'all') {
                // Group labours by site and send bulk for each site
                const bySite = {}
                labours.forEach(l => {
                    if (!bySite[l.site_id]) bySite[l.site_id] = []
                    bySite[l.site_id].push({
                        labour_id: l.id,
                        status: statuses[l.id] || 'present',
                    })
                })
                const promises = Object.entries(bySite).map(([siteId, records]) =>
                    api.post('/attendance/bulk', { site_id: siteId, date: selectedDate, records })
                )
                await Promise.all(promises)
            } else {
                const records = labours.map(l => ({
                    labour_id: l.id,
                    status: statuses[l.id] || 'present',
                }))
                await api.post('/attendance/bulk', {
                    site_id: selectedSite,
                    date: selectedDate,
                    records,
                })
            }
            toast(`Attendance saved for ${labours.length} workers!`)
            loadLaboursAndAttendance()
        } catch (err) {
            toast(err.response?.data?.detail || 'Failed to save', 'error')
        } finally { setSaving(false) }
    }

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

    const getSiteName = (siteId) => {
        const s = sites.find(s => s.id === siteId)
        return s ? s.name : 'Unknown'
    }

    const presentCount = Object.values(statuses).filter(s => s === 'present').length
    const halfCount = Object.values(statuses).filter(s => s === 'half_day').length
    const absentCount = Object.values(statuses).filter(s => s === 'absent').length

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Attendance</h1>
                <p>Mark daily attendance</p>
            </div>

            {/* Site & Date Selectors */}
            <div className="card mb-16">
                <div className="form-group mb-12">
                    <label className="form-label">Site</label>
                    <select
                        className="form-select"
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        id="attendance-site-select"
                    >
                        <option value="all">📋 All Sites</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        id="attendance-date-input"
                    />
                </div>
            </div>

            {/* Summary */}
            {labours.length > 0 && (
                <div className="stat-grid mb-16" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-label">Present</div>
                        <div className="stat-value text-success">{presentCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Half Day</div>
                        <div className="stat-value text-warning">{halfCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Absent</div>
                        <div className="stat-value text-danger">{absentCount}</div>
                    </div>
                </div>
            )}

            {/* Labour List */}
            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : labours.length === 0 ? (
                <div className="empty-state"><p>{selectedSite === 'all' ? 'No labours found. Add labours first.' : 'No labours in this site. Add labours first.'}</p></div>
            ) : (
                <>
                    <div className="card">
                        {labours.map((l) => (
                            <div key={l.id} className="attendance-row">
                                <div className="attendance-name">
                                    {l.name}
                                    <div className="attendance-wage">
                                        {fmt(l.daily_wage)}/day
                                        {selectedSite === 'all' && (
                                            <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: '0.7rem' }}>
                                                📍 {getSiteName(l.site_id)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="status-toggle">
                                    {['present', 'half_day', 'absent'].map(s => (
                                        <button
                                            key={s}
                                            className={`status-btn ${statuses[l.id] === s ? `selected-${s}` : ''}`}
                                            onClick={() => setStatus(l.id, s)}
                                            type="button"
                                            id={`att-${l.id}-${s}`}
                                        >
                                            {s === 'present' ? 'P' : s === 'half_day' ? '½' : 'A'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary btn-block mt-16"
                        onClick={handleSubmit}
                        disabled={saving}
                        id="save-attendance-btn"
                    >
                        {saving ? 'Saving...' : `Save Attendance (${labours.length} workers)`}
                    </button>
                </>
            )}
        </div>
    )
}
