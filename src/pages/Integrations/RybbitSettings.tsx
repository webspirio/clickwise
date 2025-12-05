import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Check, Globe, Key, Code } from "lucide-react"
import { toast } from "sonner"
import { api, RybbitTrackingConfig } from "@/lib/api"
import { useSettings } from "@/contexts/SettingsContext"

export function RybbitSettings() {
    const { settings: contextSettings, refreshSettings } = useSettings()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Rybbit settings
    const [rybbitEnabled, setRybbitEnabled] = useState(false)
    const [rybbitSiteId, setRybbitSiteId] = useState('') // Deprecated/Legacy
    const [rybbitApiVersion, setRybbitApiVersion] = useState('v2')
    const [rybbitApiKey, setRybbitApiKey] = useState('')
    const [rybbitDomain, setRybbitDomain] = useState('https://app.rybbit.io')
    const [rybbitTrackingId, setRybbitTrackingId] = useState('')
    const [rybbitWebsiteId, setRybbitWebsiteId] = useState('')
    const [trackingConfig, setTrackingConfig] = useState<RybbitTrackingConfig | null>(null)
    const [loadingConfig, setLoadingConfig] = useState(false)

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true)

            if (!contextSettings) {
                await refreshSettings()
                return
            }

            const settings = contextSettings

            // Rybbit settings
            const rybbitEnabled = settings.clickwise_rybbit_enabled === '1'
            const rybbitSiteId = settings.clickwise_rybbit_site_id || ''
            const rybbitApiVersion = settings.clickwise_rybbit_api_version || 'v2'
            const rybbitApiKey = settings.clickwise_rybbit_api_key || ''
            const rybbitDomain = settings.clickwise_rybbit_domain || 'https://app.rybbit.io'
            const rybbitTrackingId = settings.clickwise_rybbit_tracking_id || ''
            const rybbitWebsiteId = settings.clickwise_rybbit_website_id || ''

            setRybbitEnabled(rybbitEnabled)
            setRybbitSiteId(rybbitSiteId)
            setRybbitApiVersion(rybbitApiVersion)
            setRybbitApiKey(rybbitApiKey)
            setRybbitDomain(rybbitDomain)
            setRybbitTrackingId(rybbitTrackingId)
            setRybbitWebsiteId(rybbitWebsiteId)

        } catch (error) {
            console.error('❌ Rybbit Settings: Failed to load settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }, [contextSettings, refreshSettings])

    useEffect(() => {
        if (contextSettings) {
            loadSettings()
        }
    }, [contextSettings, loadSettings])

    const saveSettings = async () => {
        try {
            setSaving(true)

            const settingsToSave = {
                ...contextSettings, // Preserve other settings
                clickwise_rybbit_enabled: rybbitEnabled ? '1' : '',
                clickwise_rybbit_site_id: rybbitSiteId,
                clickwise_rybbit_api_version: rybbitApiVersion,
                clickwise_rybbit_api_key: rybbitApiKey,
                clickwise_rybbit_domain: rybbitDomain,
                clickwise_rybbit_tracking_id: rybbitTrackingId,
                clickwise_rybbit_website_id: rybbitWebsiteId,
            }

            await api.saveSettings(settingsToSave)
            await refreshSettings()

            window.dispatchEvent(new Event('clickwise-trigger-logo-animation'));
            toast.success('Rybbit settings saved successfully!')

        } catch (error) {
            console.error('❌ Rybbit Settings: Failed to save settings:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const testConnection = async () => {
        setErrors({})
        try {
            const config: Record<string, unknown> = {
                website_id: rybbitWebsiteId,
                domain: rybbitDomain,
                api_version: rybbitApiVersion
            }
            // Only send API key if it's not the placeholder
            if (rybbitApiKey !== '••••••••••••••••') {
                config.api_key = rybbitApiKey
            }

            const result = await api.testHandler('rybbit', config)
            toast.success(result.message)
        } catch (err: unknown) {
            const error = err as { message?: string; data?: { data?: { field?: string } } }
            const message = error.message || `Rybbit connection test failed`
            toast.error(message)

            if (error.data?.data?.field) {
                const field = error.data.data.field;
                setErrors(prev => ({ ...prev, [field]: message }));
            } else {
                if (message.toLowerCase().includes('api key')) {
                    setErrors(prev => ({ ...prev, api_key: message }))
                } else if (message.toLowerCase().includes('website id')) {
                    setErrors(prev => ({ ...prev, website_id: message }))
                } else if (message.toLowerCase().includes('domain')) {
                    setErrors(prev => ({ ...prev, domain: message }))
                }
            }
        }
    }

    const checkTrackingConfig = async () => {
        if (!rybbitWebsiteId) {
            toast.error('Website ID is required to check configuration')
            return
        }

        try {
            setLoadingConfig(true)
            const config = await api.rybbit.getTrackingConfig(rybbitWebsiteId, {
                clickwise_rybbit_domain: rybbitDomain
            })
            setTrackingConfig(config)
            toast.success('Tracking configuration loaded')
        } catch (error) {
            console.error('Failed to load tracking config:', error)
            toast.error('Failed to load tracking configuration')
            setTrackingConfig(null)
        } finally {
            setLoadingConfig(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8 space-y-8 max-w-5xl mx-auto">
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading settings...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Rybbit Integration</h2>
                    <p className="text-muted-foreground mt-1">Configure your Rybbit analytics connection.</p>
                </div>
                <Button onClick={saveSettings} disabled={saving}>
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between space-x-2 mb-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Enable Rybbit</Label>
                        <p className="text-sm text-muted-foreground">
                            Start tracking events with Rybbit.
                        </p>
                    </div>
                    <Switch
                        checked={rybbitEnabled}
                        onCheckedChange={setRybbitEnabled}
                    />
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Tracking Configuration
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rybbit-url" className="text-foreground">Rybbit URL</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                <Input
                                    id="rybbit-url"
                                    value={rybbitDomain}
                                    onChange={(e) => {
                                        setRybbitDomain(e.target.value)
                                        if (errors.domain) setErrors(prev => ({ ...prev, domain: '' }))
                                    }}
                                    className={`pl-9 ${errors.domain ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    placeholder="https://app.rybbit.io"
                                />
                            </div>
                            {errors.domain && <p className="text-xs text-red-500 font-medium">{errors.domain}</p>}
                            <p className="text-xs text-muted-foreground">
                                The base URL of your Rybbit instance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tracking Config Display */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            Remote Configuration
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={checkTrackingConfig}
                            disabled={loadingConfig || !rybbitWebsiteId}
                        >
                            {loadingConfig ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Check Config
                        </Button>
                    </div>

                    {!trackingConfig && !loadingConfig && (
                        <p className="text-sm text-muted-foreground">
                            Click "Check Config" to view the active tracking configuration from the server.
                        </p>
                    )}

                    {trackingConfig && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">Session Replay</span>
                                <Switch checked={trackingConfig.sessionReplay} disabled />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">Web Vitals</span>
                                <Switch checked={trackingConfig.webVitals} disabled />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">Track Errors</span>
                                <Switch checked={trackingConfig.trackErrors} disabled />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">Track Outbound</span>
                                <Switch checked={trackingConfig.trackOutbound} disabled />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">Track URL Params</span>
                                <Switch checked={trackingConfig.trackUrlParams} disabled />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">Initial Page View</span>
                                <Switch checked={trackingConfig.trackInitialPageView} disabled />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <span className="text-sm font-medium">SPA Navigation</span>
                                <Switch checked={trackingConfig.trackSpaNavigation} disabled />
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        API Configuration
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-key" className="text-foreground">API Key</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
                                <Input
                                    id="api-key"
                                    value={rybbitApiKey}
                                    onChange={(e) => {
                                        setRybbitApiKey(e.target.value)
                                        if (errors.api_key) setErrors(prev => ({ ...prev, api_key: '' }))
                                    }}
                                    className={`pl-9 ${errors.api_key ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    placeholder="Enter your API Key"
                                />
                            </div>
                            {errors.api_key && <p className="text-xs text-red-500 font-medium">{errors.api_key}</p>}
                            <p className="text-xs text-muted-foreground">
                                Found in your Rybbit Account settings. Required for dashboard data.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="api-version" className="text-foreground">API Version</Label>
                            <div className="relative">
                                <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
                                <Select value={rybbitApiVersion} onValueChange={setRybbitApiVersion}>
                                    <SelectTrigger className="pl-9 bg-background/50 dark:bg-input/20">
                                        <SelectValue placeholder="Select version" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="v1">v1</SelectItem>
                                        <SelectItem value="v2">v2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                The API version for Rybbit integration (e.g., 'v2').
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website-id" className="text-foreground">Website ID</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
                                <Input
                                    id="website-id"
                                    value={rybbitWebsiteId}
                                    onChange={(e) => {
                                        setRybbitWebsiteId(e.target.value)
                                        if (errors.website_id) setErrors(prev => ({ ...prev, website_id: '' }))
                                    }}
                                    className={`pl-9 ${errors.website_id ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    placeholder="e.g., 1234"
                                />
                            </div>
                            {errors.website_id && <p className="text-xs text-red-500 font-medium">{errors.website_id}</p>}
                            <p className="text-xs text-muted-foreground">
                                The numeric ID from your Rybbit dashboard URL (e.g., app.rybbit.io/1234/main).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={testConnection}
                        disabled={!rybbitEnabled || !rybbitDomain}
                    >
                        Test Connection
                    </Button>
                </div>
            </div>
        </div>
    )
}
