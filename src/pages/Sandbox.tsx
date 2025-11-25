import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Trash2, Terminal, Loader2, Settings } from "lucide-react"
import { api } from "@/lib/api"

export function Sandbox() {
    const [eventName, setEventName] = useState("custom_event")
    const [eventProps, setEventProps] = useState('{\n    "test_mode": true,\n    "source": "admin_sandbox"\n}')
    const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; icon: string; color: string; type: 'info' | 'success' | 'error' }>>([])
    const [selectedHandlers, setSelectedHandlers] = useState<string[]>(['rybbit'])
    const [isSending, setIsSending] = useState(false)

    // Get handler status from global settings
    const rybbitEnabled = window.clickwiseSettings?.rybbitEnabled === '1'
    const gaEnabled = window.clickwiseSettings?.gaEnabled === '1'

    const availableHandlers = [
        { id: 'rybbit', name: 'Rybbit', enabled: rybbitEnabled, icon: '🚀' },
        { id: 'ga', name: 'Google Analytics', enabled: gaEnabled, icon: '📊' }
    ]

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        const icon = {
            info: '➜',
            success: '✓',
            error: '✗'
        }[type]
        const color = {
            info: 'text-slate-300',
            success: 'text-green-400',
            error: 'text-red-400'
        }[type]

        setLogs(prev => [{ timestamp, message, icon, color, type }, ...prev.slice(0, 49)]) // Keep last 50 logs
    }

    const handleSend = async () => {
        if (selectedHandlers.length === 0) {
            addLog('No handlers selected. Please select at least one handler.', 'error')
            return
        }

        try {
            const props = JSON.parse(eventProps)
            setIsSending(true)

            addLog(`Sending event "${eventName}" to ${selectedHandlers.length} handler(s)...`, 'info')

            const response = await api.sendTestEvent(eventName, props, selectedHandlers)

            if (response.success) {
                addLog(`Event sent successfully!`, 'success')

                // Log individual handler results
                Object.entries(response.results).forEach(([handler, result]: [string, any]) => {
                    if (result.success) {
                        addLog(`${handler.toUpperCase()}: ${result.message}`, 'success')
                    } else {
                        addLog(`${handler.toUpperCase()}: ${result.message}`, 'error')
                    }
                })
            } else {
                addLog('Failed to send event', 'error')
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                addLog('Invalid JSON in event properties', 'error')
            } else {
                addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
            }
        } finally {
            setIsSending(false)
        }
    }

    const handleHandlerToggle = (handlerId: string, checked: boolean) => {
        setSelectedHandlers(prev =>
            checked
                ? [...prev, handlerId]
                : prev.filter(id => id !== handlerId)
        )
    }

    const testHandlerConnection = async (handlerId: 'rybbit' | 'ga') => {
        try {
            addLog(`Testing ${handlerId.toUpperCase()} connection...`, 'info')
            const response = await api.testHandler(handlerId)
            if (response.success) {
                addLog(`${handlerId.toUpperCase()}: ${response.message}`, 'success')
            } else {
                addLog(`${handlerId.toUpperCase()}: Connection failed`, 'error')
            }
        } catch (error) {
            addLog(`${handlerId.toUpperCase()}: ${error instanceof Error ? error.message : 'Connection failed'}`, 'error')
        }
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Event Sandbox</h2>
                    <p className="text-muted-foreground mt-1">Test your tracking configuration by sending custom events.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="glass-card border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            Event Composer
                        </CardTitle>
                        <CardDescription>Construct and send a test event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Handler Selection */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Target Handlers</Label>
                            <div className="grid gap-3">
                                {availableHandlers.map((handler) => (
                                    <div key={handler.id} className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${handler.enabled
                                            ? 'border-border hover:border-primary/50 bg-card/50'
                                            : 'border-muted bg-muted/30 opacity-60'
                                        }`}>
                                        <Checkbox
                                            checked={selectedHandlers.includes(handler.id)}
                                            onCheckedChange={(checked) => handleHandlerToggle(handler.id, !!checked)}
                                            disabled={!handler.enabled}
                                        />
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="text-lg">{handler.icon}</span>
                                            <span className="font-medium">{handler.name}</span>
                                            {!handler.enabled && (
                                                <span className="text-xs text-muted-foreground">(Disabled)</span>
                                            )}
                                        </div>
                                        {handler.enabled && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => testHandlerConnection(handler.id as 'rybbit' | 'ga')}
                                            >
                                                <Settings className="h-3 w-3 mr-1" />
                                                Test
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {selectedHandlers.length === 0 && (
                                <p className="text-sm text-muted-foreground">Select at least one handler to send events.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="event-name">Event Name</Label>
                            <Input
                                id="event-name"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="font-mono"
                                placeholder="e.g., custom_click, test_event"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="event-props">Event Properties (JSON)</Label>
                            <Textarea
                                id="event-props"
                                value={eventProps}
                                onChange={(e) => setEventProps(e.target.value)}
                                className="font-mono h-48 bg-background/50 dark:bg-input/20 border-input"
                                placeholder='{\n    "key": "value",\n    "user_id": "123"\n}'
                            />
                        </div>

                        <Button
                            onClick={handleSend}
                            className="w-full"
                            disabled={isSending || selectedHandlers.length === 0}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Send Test Event
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-md flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Console Log</CardTitle>
                            <CardDescription>Real-time feedback from your tests.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setLogs([])}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px]">
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-lg h-full overflow-y-auto font-mono text-sm shadow-inner border border-white/10">
                            {logs.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">
                                    Ready to capture events...
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="mb-2 border-b border-slate-800 pb-1 last:border-0">
                                        <span className={`inline-block w-4 ${log.color}`}>{log.icon}</span>
                                        <span className="text-slate-400 text-xs mr-2">[{log.timestamp}]</span>
                                        <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
