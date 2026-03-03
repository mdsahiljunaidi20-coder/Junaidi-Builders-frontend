import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null)

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type })
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            {toast && (
                <div className={`toast toast-${toast.type}`} role="alert">
                    {toast.message}
                </div>
            )}
        </ToastContext.Provider>
    )
}

export function useToast() {
    return useContext(ToastContext)
}
