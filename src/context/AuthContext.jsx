import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const savedToken = localStorage.getItem('jb_token')
        const savedUser = localStorage.getItem('jb_user')
        if (savedToken && savedUser) {
            setToken(savedToken)
            setUser(JSON.parse(savedUser))
        }
        setLoading(false)
    }, [])

    const login = async (email, password) => {
        const res = await api.post('/users/login', { email, password })
        const { token: t, user: u } = res.data
        localStorage.setItem('jb_token', t)
        localStorage.setItem('jb_user', JSON.stringify(u))
        setToken(t)
        setUser(u)
        return u
    }

    const logout = () => {
        localStorage.removeItem('jb_token')
        localStorage.removeItem('jb_user')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}
