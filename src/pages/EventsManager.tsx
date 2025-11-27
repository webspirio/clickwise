import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Download, Plus } from "lucide-react"
import { api, type Event, type EventsResponse } from "@/lib/api"
import { DataTable } from "@/components/data-table/data-table"
import { getColumns } from "@/components/EventManager/columns"

export function EventsManager() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [eventsData, setEventsData] = useState<EventsResponse>({ tracked: [], ignored: [], sessions: [] })
    const [refreshing, setRefreshing] = useState(false)

    // Selection state for each tab
    const [trackedRowSelection, setTrackedRowSelection] = useState({})
    const [ignoredRowSelection, setIgnoredRowSelection] = useState({})

    // Helper to get selected IDs from row selection state
    const getSelectedIds = (rowSelection: Record<string, boolean>, data: Event[]) => {
        return Object.keys(rowSelection)
            .filter(key => rowSelection[key])
            .map(index => data[parseInt(index)]?.id)
            .filter(Boolean)
    }

    useEffect(() => {
        loadEvents()
    }, [])

    const loadEvents = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await api.getEvents()
            setEventsData(data)
            setTrackedRowSelection({})
            setIgnoredRowSelection({})
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

    const handleBulkAction = async (action: 'track' | 'ignore' | 'delete', ids: string[]) => {
        if (ids.length === 0) return

        try {
            await api.bulkUpdateEvents(ids, action)
            await loadEvents()
        } catch (err) {
            console.error('Bulk action failed:', err)
        }
    }

    const handleEventUpdate = async (event: Event, updates: { status?: string; alias?: string }) => {
        try {
            await api.updateEvent(event.id, updates)
            await loadEvents()
        } catch (err) {
            console.error('Event update failed:', err)
        }
    }

    const columns = useMemo(() => getColumns({
        onTrack: (event) => handleEventUpdate(event, { status: 'tracked' }),
        onIgnore: (event) => handleEventUpdate(event, { status: 'ignored' }),
        onDelete: (event) => handleBulkAction('delete', [event.id]),
    }), [])

    const renderBulkActions = (selectedIds: string[], allowedActions: string[]) => {
        if (selectedIds.length === 0) return null

        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                </span>
                {allowedActions.includes('track') && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('track', selectedIds)}
                    >
                        Track
                    </Button>
                )}
                {allowedActions.includes('ignore') && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('ignore', selectedIds)}
                    >
                        Ignore
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete', selectedIds)}
                >
                    Delete
                </Button>
            </div>
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

    const trackedSelectedIds = getSelectedIds(trackedRowSelection, eventsData.tracked)
    const ignoredSelectedIds = getSelectedIds(ignoredRowSelection, eventsData.ignored)

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
                            <DataTable
                                columns={columns}
                                data={eventsData.tracked}
                                searchKey="name"
                                searchPlaceholder="Filter events..."
                                rowSelection={trackedRowSelection}
                                onRowSelectionChange={setTrackedRowSelection}
                                toolbar={renderBulkActions(trackedSelectedIds, ['ignore'])}
                            />
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
                            <DataTable
                                columns={columns}
                                data={eventsData.ignored}
                                searchKey="name"
                                searchPlaceholder="Filter events..."
                                rowSelection={ignoredRowSelection}
                                onRowSelectionChange={setIgnoredRowSelection}
                                toolbar={renderBulkActions(ignoredSelectedIds, ['track'])}
                            />
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
                        eventsData.sessions.map((session: any) => (
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
                                    <DataTable
                                        columns={columns}
                                        data={session.events}
                                        searchKey="name"
                                        searchPlaceholder="Filter events..."
                                    />
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
