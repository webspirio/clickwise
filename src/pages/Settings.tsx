import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useSettings } from "@/contexts/SettingsContext"

export function Settings() {
    const { settings: contextSettings, refreshSettings } = useSettings()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // General Settings (Events & Forms, Advanced)
    // Note: These are placeholders based on the previous code. 
    // If there were actual state variables for these, I would include them.
    // Looking at the previous code, "Events & Forms" and "Advanced" inputs were not controlled components 
    // (they didn't have value/onChange props connected to state), except for the Switch/Input which were just placeholders.
    // I will keep them as placeholders or implement them if I see them in the context settings.
    // The previous code had: <Input id="url-patterns" placeholder="/blog/*, !/admin/*" /> without value/onChange.
    // So I will keep the structure but they are effectively static/mocked for now unless I find the actual settings keys.
    // Assuming they are future features or I missed the keys. 
    // Wait, let's check the loadSettings in the original file.
    // It only parsed Rybbit and GA4 settings.
    // So "Events & Forms" and "Advanced" were indeed just UI placeholders.
    // I will keep them as is.

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true)
            if (!contextSettings) {
                await refreshSettings()
                return
            }
            // No specific settings to load for the remaining tabs yet
        } catch (error) {
            console.error('❌ Settings: Failed to load settings:', error)
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

            // For now, we are just saving the existing settings back to ensure we don't break anything.
            // If we implement actual settings for Events/Advanced, we would update them here.
            const settingsToSave = {
                ...contextSettings,
            }

            await api.saveSettings(settingsToSave)
            await refreshSettings()

            window.dispatchEvent(new Event('clickwise-trigger-logo-animation'));
            toast.success('Settings saved successfully!')

        } catch (error) {
            console.error('❌ Settings: Failed to save settings:', error)
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
                    <h2 className="text-3xl font-bold tracking-tight">Plugin Settings</h2>
                    <p className="text-muted-foreground mt-1">Manage global plugin configuration.</p>
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

            <Tabs defaultValue="events" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="events">Events & Forms</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

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
