import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'

interface Settings {
    clickwise_rybbit_enabled?: string
    clickwise_rybbit_site_id?: string
    clickwise_rybbit_script_url?: string
    clickwise_rybbit_api_version?: string
    clickwise_rybbit_api_key?: string
    clickwise_rybbit_domain?: string
    clickwise_rybbit_script_path?: string
    clickwise_rybbit_tracking_id?: string
    clickwise_rybbit_website_id?: string
    clickwise_ga_enabled?: string
    clickwise_ga_measurement_id?: string
    clickwise_ga_api_secret?: string
}

interface SettingsContextType {
    settings: Settings | null
    loading: boolean
    error: string | null
    refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

interface SettingsProviderProps {
    children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const [settings, setSettings] = useState<Settings | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadSettings = async () => {
        try {
            logger.debug('Loading settings', { context: 'SettingsContext' })
            setLoading(true)
            setError(null)
            const settingsData = await api.getSettings()
            setSettings(settingsData)
            logger.debug('Settings loaded successfully', { context: 'SettingsContext' })
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load settings'
            logger.error('Error loading settings', err, { context: 'SettingsContext' })
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSettings()
    }, [])

    const refreshSettings = async () => {
        logger.debug('Refreshing settings', { context: 'SettingsContext' })
        await loadSettings()
    }

    const value = useMemo(
        () => ({
            settings,
            loading,
            error,
            refreshSettings
        }),
        [settings, loading, error]
    )

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
