import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

export function Settings() {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Rybbit settings
    const [rybbitEnabled, setRybbitEnabled] = useState(false)
    const [rybbitSiteId, setRybbitSiteId] = useState('')
    const [rybbitScriptUrl, setRybbitScriptUrl] = useState('')
    const [rybbitApiVersion, setRybbitApiVersion] = useState('v2')

    // GA4 settings
    const [gaEnabled, setGaEnabled] = useState(false)
    const [gaMeasurementId, setGaMeasurementId] = useState('')
    const [gaApiSecret, setGaApiSecret] = useState('')

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            setLoading(true)
            const settings = await api.getSettings()

            // Rybbit settings
            setRybbitEnabled(settings.clickwise_rybbit_enabled === '1')
            setRybbitSiteId(settings.clickwise_rybbit_site_id || '')
            setRybbitScriptUrl(settings.clickwise_rybbit_script_url || '')
            setRybbitApiVersion(settings.clickwise_rybbit_api_version || 'v2')

            // GA4 settings
            setGaEnabled(settings.clickwise_ga_enabled === '1')
            setGaMeasurementId(settings.clickwise_ga_measurement_id || '')
            setGaApiSecret(settings.clickwise_ga_api_secret || '')

        } catch (error) {
            console.error('Failed to load settings:', error)
            setMessage({ type: 'error', text: 'Failed to load settings' })
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        try {
            setSaving(true)
            setMessage(null)

            const settingsToSave = {
                clickwise_rybbit_enabled: rybbitEnabled ? '1' : '',
                clickwise_rybbit_site_id: rybbitSiteId,
                clickwise_rybbit_script_url: rybbitScriptUrl,
                clickwise_rybbit_api_version: rybbitApiVersion,
                clickwise_ga_enabled: gaEnabled ? '1' : '',
                clickwise_ga_measurement_id: gaMeasurementId,
                clickwise_ga_api_secret: gaApiSecret,
            }

            await api.saveSettings(settingsToSave)
            setMessage({ type: 'success', text: 'Settings saved successfully!' })

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000)

        } catch (error) {
            console.error('Failed to save settings:', error)
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
                <div className={`p-4 rounded-lg ${
                    message.type === 'success'
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Rybbit Analytics</CardTitle>
                            <CardDescription>
                                Configure your connection to Rybbit.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
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
                            <div className="grid gap-2">
                                <Label htmlFor="rybbit-site-id">Site ID</Label>
                                <Input
                                    id="rybbit-site-id"
                                    placeholder="Enter your Site ID"
                                    value={rybbitSiteId}
                                    onChange={(e) => setRybbitSiteId(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rybbit-script-url">Script URL</Label>
                                <Input
                                    id="rybbit-script-url"
                                    placeholder="https://..."
                                    value={rybbitScriptUrl}
                                    onChange={(e) => setRybbitScriptUrl(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rybbit-api-version">API Version</Label>
                                <Select
                                    value={rybbitApiVersion}
                                    onValueChange={setRybbitApiVersion}
                                >
                                    <SelectTrigger id="rybbit-api-version">
                                        <SelectValue placeholder="Select version" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="v1">v1 (Legacy)</SelectItem>
                                        <SelectItem value="v2">v2 (Recommended)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-4">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => testConnection('rybbit')}
                                    disabled={!rybbitEnabled || !rybbitSiteId || !rybbitScriptUrl}
                                >
                                    Test Connection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
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
            </Tabs>
        </div>
    )
}
