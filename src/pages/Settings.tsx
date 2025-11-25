import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function Settings() {
    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground mt-1">Manage your plugin configuration and preferences.</p>
                </div>
                <Button>Save Changes</Button>
            </div>

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
                                <Switch defaultChecked />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rybbit-site-id">Site ID</Label>
                                <Input id="rybbit-site-id" placeholder="Enter your Site ID" defaultValue={window.clickwiseSettings?.siteId} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rybbit-script-url">Script URL</Label>
                                <Input id="rybbit-script-url" placeholder="https://..." defaultValue={window.clickwiseSettings?.scriptUrl} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rybbit-api-version">API Version</Label>
                                <Select defaultValue="v2">
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
                                <Button variant="outline" className="w-full sm:w-auto">Test Connection</Button>
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
                                <Switch />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ga4-measurement-id">Measurement ID</Label>
                                <Input id="ga4-measurement-id" placeholder="G-XXXXXXXXXX" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ga4-api-secret">API Secret</Label>
                                <Input id="ga4-api-secret" type="password" placeholder="Enter API Secret" />
                            </div>
                            <div className="pt-4">
                                <Button variant="outline" className="w-full sm:w-auto">Test Connection</Button>
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
