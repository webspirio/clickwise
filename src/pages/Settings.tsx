import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Check, AlertCircle, Globe, Key, Code } from "lucide-react"
import { api } from "@/lib/api"
import { useSettings } from "@/contexts/SettingsContext"

export function Settings() {
    const { settings: contextSettings, refreshSettings } = useSettings()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Rybbit settings
    const [rybbitEnabled, setRybbitEnabled] = useState(false)
    const [rybbitSiteId, setRybbitSiteId] = useState('') // Deprecated/Legacy
    const [rybbitApiVersion, setRybbitApiVersion] = useState('v2')
    const [rybbitApiKey, setRybbitApiKey] = useState('')
    const [rybbitDomain, setRybbitDomain] = useState('https://app.rybbit.io')
    const [rybbitTrackingId, setRybbitTrackingId] = useState('')
    const [rybbitWebsiteId, setRybbitWebsiteId] = useState('')

    // GA4 settings
    const [gaEnabled, setGaEnabled] = useState(false)
    const [gaMeasurementId, setGaMeasurementId] = useState('')
    const [gaApiSecret, setGaApiSecret] = useState('')

    useEffect(() => {
        console.log('🚀 Settings: Component mounted or context settings updated, loading settings...')
        if (contextSettings) {
            loadSettings()
        }
    }, [contextSettings])

    const loadSettings = async () => {
        try {
            console.log('🔄 Settings: Loading settings...')
            setLoading(true)

            // Use settings from context instead of fetching
            if (!contextSettings) {
                console.log('⏳ Settings: Waiting for context settings to load...')
                await refreshSettings()
                return
            }

            const settings = contextSettings
            console.log('📋 Settings: Using settings from context:', settings)

            // Rybbit settings
            // Note: API key returns placeholder (••••) if set, for security reasons
            const rybbitEnabled = settings.clickwise_rybbit_enabled === '1'
            const rybbitSiteId = settings.clickwise_rybbit_site_id || ''
            const rybbitApiVersion = settings.clickwise_rybbit_api_version || 'v2'
            const rybbitApiKey = settings.clickwise_rybbit_api_key || ''
            const rybbitDomain = settings.clickwise_rybbit_domain || 'https://app.rybbit.io'
            const rybbitTrackingId = settings.clickwise_rybbit_tracking_id || ''
            const rybbitWebsiteId = settings.clickwise_rybbit_website_id || ''

            console.log('🔧 Settings: Parsed Rybbit settings:', {
                enabled: rybbitEnabled,
                siteId: rybbitSiteId,
                apiVersion: rybbitApiVersion,
                apiKey: rybbitApiKey ? '[SET]' : '[NOT SET]',
                domain: rybbitDomain,
                trackingId: rybbitTrackingId,
                websiteId: rybbitWebsiteId,
            })

            setRybbitEnabled(rybbitEnabled)
            setRybbitSiteId(rybbitSiteId)
            setRybbitApiVersion(rybbitApiVersion)
            setRybbitApiKey(rybbitApiKey)
            setRybbitDomain(rybbitDomain)
            setRybbitTrackingId(rybbitTrackingId)
            setRybbitWebsiteId(rybbitWebsiteId)

            // GA4 settings
            const gaEnabled = settings.clickwise_ga_enabled === '1'
            const gaMeasurementId = settings.clickwise_ga_measurement_id || ''
            const gaApiSecret = settings.clickwise_ga_api_secret || ''

            console.log('📊 Settings: Parsed GA4 settings:', {
                enabled: gaEnabled,
                measurementId: gaMeasurementId,
                apiSecret: gaApiSecret ? '[HIDDEN]' : ''
            })

            setGaEnabled(gaEnabled)
            setGaMeasurementId(gaMeasurementId)
            setGaApiSecret(gaApiSecret)

        } catch (error) {
            console.error('❌ Settings: Failed to load settings:', error)
            setMessage({ type: 'error', text: 'Failed to load settings' })
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        try {
            console.log('💾 Settings: Starting save process...')
            setSaving(true)
            setMessage(null)

            const settingsToSave = {
                clickwise_rybbit_enabled: rybbitEnabled ? '1' : '',
                clickwise_rybbit_site_id: rybbitSiteId,
                clickwise_rybbit_api_version: rybbitApiVersion,
                clickwise_rybbit_api_key: rybbitApiKey,
                clickwise_rybbit_domain: rybbitDomain,
                clickwise_rybbit_tracking_id: rybbitTrackingId,
                clickwise_rybbit_website_id: rybbitWebsiteId,
                clickwise_ga_enabled: gaEnabled ? '1' : '',
                clickwise_ga_measurement_id: gaMeasurementId,
                clickwise_ga_api_secret: gaApiSecret,
            }

            console.log('📝 Settings: Prepared settings object:', settingsToSave)
            console.log('🔧 Settings: Current form state:', {
                rybbitEnabled,
                rybbitSiteId,
                rybbitApiVersion,
                rybbitApiKey: rybbitApiKey ? '[HIDDEN]' : '',
                gaEnabled,
                gaMeasurementId,
                gaApiSecret: gaApiSecret ? '[HIDDEN]' : ''
            })

            await api.saveSettings(settingsToSave)
            console.log('✅ Settings: Save completed successfully!')

            // Refresh settings context so Dashboard gets updated values
            await refreshSettings()
            console.log('🔃 Settings: Context refreshed after save')

            window.dispatchEvent(new Event('clickwise-trigger-logo-animation'));
            setMessage({ type: 'success', text: 'Settings saved successfully!' })

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000)

        } catch (error) {
            console.error('❌ Settings: Failed to save settings:', error)
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to save settings'
            })
        } finally {
            setSaving(false)
        }
    }

    const testConnection = async (type: 'rybbit' | 'ga') => {
        try {
            const result = await api.testHandler(type)
            setMessage({ type: 'success', text: result.message })
            setTimeout(() => setMessage(null), 5000)
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : `${type} connection test failed`
            })
            setTimeout(() => setMessage(null), 5000)
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
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground mt-1">Manage your plugin configuration and preferences.</p>
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

            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <div className="flex items-center">
                        {message.type === 'success' ? (
                            <Check className="h-4 w-4 mr-2" />
                        ) : (
                            <AlertCircle className="h-4 w-4 mr-2" />
                        )}
                        {message.text}
                    </div>
                </div>
            )}

            <Tabs defaultValue="rybbit" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="rybbit">Rybbit</TabsTrigger>
                    <TabsTrigger value="ga4">Google Analytics 4</TabsTrigger>
                    <TabsTrigger value="events">Events & Forms</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="rybbit" className="space-y-6">
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
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                                    <Input
                                        id="rybbit-url"
                                        value={rybbitDomain}
                                        onChange={(e) => setRybbitDomain(e.target.value)}
                                        className="pl-9"
                                        placeholder="https://app.rybbit.io"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    The base URL of your Rybbit instance.
                                </p>
                            </div>


                        </div>
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
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                                    <Input
                                        id="api-key"
                                        type="password"
                                        value={rybbitApiKey}
                                        onChange={(e) => setRybbitApiKey(e.target.value)}
                                        className="pl-9"
                                        placeholder="Enter your API Key"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Found in your Rybbit Account settings. Required for dashboard data.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="api-version" className="text-foreground">API Version</Label>
                                <div className="relative">
                                    <Code className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                                    <Input
                                        id="api-version"
                                        type="text"
                                        value={rybbitApiVersion}
                                        onChange={(e) => setRybbitApiVersion(e.target.value)}
                                        className="pl-9"
                                        placeholder="e.g., v2"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    The API version for Rybbit integration (e.g., 'v2').
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website-id" className="text-foreground">Website ID</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                                    <Input
                                        id="website-id"
                                        type="text"
                                        value={rybbitWebsiteId}
                                        onChange={(e) => setRybbitWebsiteId(e.target.value)}
                                        className="pl-9"
                                        placeholder="e.g., 1234"
                                    />
                                </div>
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
                            onClick={() => testConnection('rybbit')}
                            disabled={!rybbitEnabled || !rybbitDomain}
                        >
                            Test Connection
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="ga4" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Analytics 4</CardTitle>
                            <CardDescription>
                                Send events to GA4 via server-side tracking.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable GA4</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Forward events to Google Analytics.
                                    </p>
                                </div>
                                <Switch
                                    checked={gaEnabled}
                                    onCheckedChange={setGaEnabled}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ga4-measurement-id">Measurement ID</Label>
                                <Input
                                    id="ga4-measurement-id"
                                    placeholder="G-XXXXXXXXXX"
                                    value={gaMeasurementId}
                                    onChange={(e) => setGaMeasurementId(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ga4-api-secret">API Secret (Optional)</Label>
                                <Input
                                    id="ga4-api-secret"
                                    type="password"
                                    placeholder="Enter API Secret"
                                    value={gaApiSecret}
                                    onChange={(e) => setGaApiSecret(e.target.value)}
                                />
                            </div>
                            <div className="pt-4">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => testConnection('ga')}
                                    disabled={!gaEnabled || !gaMeasurementId}
                                >
                                    Test Connection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="events" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Events & Forms</CardTitle>
                            <CardDescription>
                                Global settings for event capture.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Track Admin Users</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable tracking for logged-in administrators.
                                    </p>
                                </div>
                                <Switch />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="url-patterns">URL Patterns (Include/Exclude)</Label>
                                <Input id="url-patterns" placeholder="/blog/*, !/admin/*" />
                                <p className="text-sm text-muted-foreground">Comma-separated list of patterns.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Advanced Options</CardTitle>
                            <CardDescription>
                                Technical settings for developers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Debug Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Log verbose output to the browser console.
                                    </p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >
        </div >
    )
}
