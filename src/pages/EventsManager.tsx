import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge, Loader2, RefreshCw, Download, Plus } from "lucide-react"
import { api, Event, EventsResponse } from "@/lib/api"

export function EventsManager() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [eventsData, setEventsData] = useState<EventsResponse>({ tracked: [], ignored: [], sessions: [] })
    const [selectedEvents, setSelectedEvents] = useState<string[]>([])
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadEvents()
    }, [])

    const loadEvents = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await api.getEvents()
            setEventsData(data)
            setSelectedEvents([])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load events')
        } finally {
            setLoading(false)
        }
    }

    const refreshEvents = async () => {
        setRefreshing(true)
        await loadEvents()
        setRefreshing(false)
    }

    const handleBulkAction = async (action: 'track' | 'ignore' | 'delete') => {
        if (selectedEvents.length === 0) return

        try {
            await api.bulkUpdateEvents(selectedEvents, action)
            await loadEvents()
        } catch (err) {
            console.error('Bulk action failed:', err)
        }
    }

    const handleEventUpdate = async (eventId: string, updates: { status?: string; alias?: string }) => {
        try {
            await api.updateEvent(eventId, updates)
            await loadEvents()
        } catch (err) {
            console.error('Event update failed:', err)
        }
    }

    const handleSelectAll = (checked: boolean, events: Event[]) => {
        if (checked) {
            setSelectedEvents(prev => [...new Set([...prev, ...events.map(e => e.id)])])
        } else {
            const eventIds = new Set(events.map(e => e.id))
            setSelectedEvents(prev => prev.filter(id => !eventIds.has(id)))
        }
    }

    const handleSelectEvent = (eventId: string, checked: boolean) => {
        if (checked) {
            setSelectedEvents(prev => [...prev, eventId])
        } else {
            setSelectedEvents(prev => prev.filter(id => id !== eventId))
        }
    }

    const renderEventTable = (events: Event[], allowedActions: string[]) => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading events...</span>
                </div>
            )
        }

        if (events.length === 0) {
            return (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No events found.</p>
                </div>
            )
        }

        return (
            <>
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={events.every(e => selectedEvents.includes(e.id))}
                            onCheckedChange={(checked) => handleSelectAll(!!checked, events)}
                        />
                        <span className="text-sm">Select All</span>
                    </div>
                    {selectedEvents.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {selectedEvents.length} selected
                            </span>
                            {allowedActions.includes('track') && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('track')}
                                >
                                    Track
                                </Button>
                            )}
                            {allowedActions.includes('ignore') && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('ignore')}
                                >
                                    Ignore
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleBulkAction('delete')}
                            >
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Selector</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedEvents.includes(event.id)}
                                        onCheckedChange={(checked) => handleSelectEvent(event.id, !!checked)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    {event.alias || event.name}
                                    {event.alias && (
                                        <div className="text-xs text-muted-foreground">{event.name}</div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                        {event.type}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                        {event.selector || 'N/A'}
                                    </code>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex gap-2 justify-end">
                                        {event.status === 'tracked' ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEventUpdate(event.id, { status: 'ignored' })}
                                            >
                                                Untrack
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleEventUpdate(event.id, { status: 'tracked' })}
                                            >
                                                Track
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </>
        )
    }

    if (error) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Events</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={loadEvents}>Try Again</Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Events Manager</h2>
                    <p className="text-muted-foreground mt-1">Review and manage automatically captured events.</p>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" disabled>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={refreshEvents} disabled={refreshing}>
                        {refreshing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Events
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="tracked" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="tracked">
                        Tracked Events ({eventsData.tracked.length})
                    </TabsTrigger>
                    <TabsTrigger value="ignored">
                        Ignored Events ({eventsData.ignored.length})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        History ({eventsData.sessions.length} sessions)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tracked" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Tracked Events</CardTitle>
                            <CardDescription>
                                Events currently being sent to your analytics providers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderEventTable(eventsData.tracked, ['ignore'])}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ignored" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ignored Events</CardTitle>
                            <CardDescription>
                                Events explicitly excluded from tracking.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {eventsData.ignored.length === 0 && !loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="rounded-full bg-muted p-4 mb-4">
                                        <Badge className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No ignored events</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                        You haven't ignored any events yet. Events you ignore will appear here.
                                    </p>
                                </div>
                            ) : (
                                renderEventTable(eventsData.ignored, ['track'])
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    {eventsData.sessions.length === 0 && !loading ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Event History</CardTitle>
                                <CardDescription>
                                    Recent recording sessions and discovered events.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="rounded-full bg-muted p-4 mb-4">
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No recording history</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                        Start a recording session to capture new events automatically.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        eventsData.sessions.map((session) => (
                            <Card key={session.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">
                                                Recording Session
                                            </CardTitle>
                                            <CardDescription>
                                                {new Date(parseInt(session.timestamp) * 1000).toLocaleString()} • {session.events.length} events
                                            </CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            Delete Session
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {renderEventTable(session.events, ['track', 'ignore'])}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
