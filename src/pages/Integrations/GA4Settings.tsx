import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useSettings } from "@/contexts/SettingsContext"

export function GA4Settings() {
    const { settings: contextSettings, refreshSettings } = useSettings()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // GA4 settings
    const [gaEnabled, setGaEnabled] = useState(false)
    const [gaMeasurementId, setGaMeasurementId] = useState('')
    const [gaApiSecret, setGaApiSecret] = useState('')

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true)

            if (!contextSettings) {
                await refreshSettings()
                return
            }

            const settings = contextSettings

            // GA4 settings
            const gaEnabled = settings.clickwise_ga_enabled === '1'
            const gaMeasurementId = settings.clickwise_ga_measurement_id || ''
            const gaApiSecret = settings.clickwise_ga_api_secret || ''

            setGaEnabled(gaEnabled)
            setGaMeasurementId(gaMeasurementId)
            setGaApiSecret(gaApiSecret)

        } catch (error) {
            console.error('❌ GA4 Settings: Failed to load settings:', error)
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
                clickwise_ga_enabled: gaEnabled ? '1' : '',
                clickwise_ga_measurement_id: gaMeasurementId,
                clickwise_ga_api_secret: gaApiSecret,
            }

            await api.saveSettings(settingsToSave)
            await refreshSettings()

            window.dispatchEvent(new Event('clickwise-trigger-logo-animation'));
            toast.success('GA4 settings saved successfully!')

        } catch (error) {
            console.error('❌ GA4 Settings: Failed to save settings:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to save settings')
        } finally {
            setSaving(false)
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
                    <h2 className="text-3xl font-bold tracking-tight">Google Analytics 4</h2>
                    <p className="text-muted-foreground mt-1">Configure your GA4 integration.</p>
                </div>
                <Button onClick={saveSettings} disabled={saving || true}> {/* Disabled for now as per previous task */}
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
                <Card className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="bg-primary/10 border border-primary/20 text-primary px-6 py-4 rounded-lg shadow-lg backdrop-blur-md">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                </span>
                                Coming Soon
                            </h3>
                            <p className="text-sm mt-1 text-primary/80">
                                Google Analytics 4 integration is currently under development.
                            </p>
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle>Google Analytics 4</CardTitle>
                        <CardDescription>
                            Send events to GA4 via server-side tracking.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 opacity-50 pointer-events-none">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable GA4</Label>
                                <p className="text-sm text-muted-foreground">
                                    Forward events to Google Analytics.
                                </p>
                            </div>
                            <Switch
                                checked={false}
                                disabled
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ga4-measurement-id">Measurement ID</Label>
                            <Input
                                id="ga4-measurement-id"
                                placeholder="G-XXXXXXXXXX"
                                value={gaMeasurementId}
                                disabled
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ga4-api-secret">API Secret (Optional)</Label>
                            <Input
                                id="ga4-api-secret"
                                type="password"
                                placeholder="Enter API Secret"
                                value={gaApiSecret}
                                disabled
                            />
                        </div>
                        <div className="pt-4">
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                disabled
                            >
                                Test Connection
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
