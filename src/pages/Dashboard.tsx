import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Clock, Loader2, RefreshCw, Download, Info, BarChart3, TrendingUp, Eye } from "lucide-react"
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TimeRangeSelector, formatTimeRangeDisplay } from "@/components/TimeRangeSelector"
import { api, type RybbitOverview, type RybbitMetricResponse } from "@/lib/api"

export function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [rybbitOverview, setRybbitOverview] = useState<RybbitOverview | null>(null)
    const [topPages, setTopPages] = useState<RybbitMetricResponse | null>(null)
    const [topCountries, setTopCountries] = useState<RybbitMetricResponse | null>(null)
    const [devices, setDevices] = useState<RybbitMetricResponse | null>(null)
    const [browsers, setBrowsers] = useState<RybbitMetricResponse | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [settings, setSettings] = useState<any>(null)

    // Time range state
    const [timeRange, setTimeRange] = useState<{
        preset: 'today' | 'week' | 'month' | '3months' | 'custom'
        customStart?: string
        customEnd?: string
    }>({
        preset: 'week'
    })

    useEffect(() => {
        loadSettings()
    }, [])

    useEffect(() => {
        if (settings) {
            loadDashboardData()
        }
    }, [timeRange, settings])

    const loadSettings = async () => {
        try {
            const settingsData = await api.getSettings()
            setSettings(settingsData)
        } catch (err) {
            setError('Failed to load settings. Please configure your Rybbit connection.')
        }
    }

    const loadDashboardData = async () => {
        if (!settings?.clickwise_rybbit_api_key || !settings?.clickwise_rybbit_website_id) {
            setError('Rybbit API key or Website ID not configured. Please check your settings.')
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const rybbitTimeRange = api.createTimeRange(
                timeRange.preset,
                timeRange.customStart,
                timeRange.customEnd
            )

            // Fetch overview stats
            const [overviewData, pagesData, countriesData, devicesData, browsersData] = await Promise.all([
                api.getRybbitOverview(settings.clickwise_rybbit_website_id, rybbitTimeRange),
                api.getRybbitMetric(settings.clickwise_rybbit_website_id, 'pathname', rybbitTimeRange, { limit: 10 }),
                api.getRybbitMetric(settings.clickwise_rybbit_website_id, 'country', rybbitTimeRange, { limit: 10 }),
                api.getRybbitMetric(settings.clickwise_rybbit_website_id, 'device_type', rybbitTimeRange, { limit: 10 }),
                api.getRybbitMetric(settings.clickwise_rybbit_website_id, 'browser', rybbitTimeRange, { limit: 10 }),
            ])

            setRybbitOverview(overviewData)
            setTopPages(pagesData)
            setTopCountries(countriesData)
            setDevices(devicesData)
            setBrowsers(browsersData)

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data'
            setError(errorMessage)
            console.error('Dashboard loading error:', err)
        } finally {
            setLoading(false)
        }
    }

    const refreshData = async () => {
        setRefreshing(true)
        await loadDashboardData()
        setRefreshing(false)
    }

    const formatNumber = (num: number | null | undefined) => {
        if (typeof num !== 'number') return '...';
        return new Intl.NumberFormat().format(num);
    }

    const formatDuration = (seconds: number | null | undefined) => {
        if (typeof seconds !== 'number') return '...';
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.floor(seconds % 60)
        return `${minutes}m ${remainingSeconds}s`
    }

    const formatPercentage = (num: number | null | undefined) => {
        if (typeof num !== 'number') return '...';
        return `${num.toFixed(1)}%`
    }

    if (loading) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={loadDashboardData}>Try Again</Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h2>
                        <p className="text-muted-foreground mt-1">
                            Real-time insights from your website - {formatTimeRangeDisplay(timeRange)}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
                            {refreshing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Refresh
                        </Button>
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Overview Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Sessions
                                </CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Total number of unique visits to your website</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {rybbitOverview ? formatNumber(rybbitOverview.sessions) : '...'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Unique visits
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Pageviews
                                </CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Total pages viewed across all sessions</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Eye className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {rybbitOverview ? formatNumber(rybbitOverview.pageviews) : '...'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total page views
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Unique Users
                                </CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Number of distinct visitors to your site</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Users className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                {rybbitOverview ? formatNumber(rybbitOverview.users) : '...'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Unique visitors
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Pages/Session
                                </CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Average pages viewed per session - higher is better</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <BarChart3 className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                {rybbitOverview && typeof rybbitOverview.pages_per_session === 'number' ? rybbitOverview.pages_per_session.toFixed(2) : '...'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Pages per visit
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Bounce Rate
                                </CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Percentage of visitors who leave after viewing only one page - lower is better</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <TrendingUp className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                                {rybbitOverview ? formatPercentage(rybbitOverview.bounce_rate) : '...'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Single-page visits
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Avg. Duration
                                </CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Average time visitors spend on your site per session</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Clock className="h-4 w-4 text-teal-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                                {rybbitOverview ? formatDuration(rybbitOverview.session_duration) : '...'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Time on site
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts and Data Tables Section */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Device Types Chart */}
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <CardTitle>Device Types</CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Breakdown of visitors by device category</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <CardDescription>
                                How visitors access your site
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={devices?.data || []}
                                            dataKey="count"
                                            nameKey="value"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            fill="#8884d8"
                                        >
                                            {devices?.data?.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={
                                                    index === 0 ? '#3b82f6' :
                                                        index === 1 ? '#ef4444' :
                                                            index === 2 ? '#10b981' : '#f59e0b'
                                                } />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value, name) => [formatNumber(value as number), name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Countries */}
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <CardTitle>Top Countries</CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Geographic distribution of your visitors</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <CardDescription>
                                Where your visitors come from
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {topCountries?.data?.slice(0, 5).map((country) => (
                                    <div key={country.value} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            <span className="font-medium text-sm">{country.value}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold">
                                                {formatNumber(country.count)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatPercentage(country.percentage)}
                                            </div>
                                        </div>
                                    </div>
                                )) || (
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground">Loading geographic data...</p>
                                        </div>
                                    )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Browsers */}
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <CardTitle>Top Browsers</CardTitle>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Most popular browsers among your visitors</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <CardDescription>
                                Browser preferences of visitors
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {browsers?.data?.slice(0, 5).map((browser) => (
                                    <div key={browser.value} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-green-600" />
                                            <span className="font-medium text-sm">{browser.value}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold">
                                                {formatNumber(browser.count)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatPercentage(browser.percentage)}
                                            </div>
                                        </div>
                                    </div>
                                )) || (
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground">Loading browser data...</p>
                                        </div>
                                    )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Top Pages Table */}
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <CardTitle>Most Popular Pages</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Your most visited pages with engagement metrics</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <CardDescription>
                            Page performance and visitor engagement
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Page</TableHead>
                                        <TableHead className="text-right">Sessions</TableHead>
                                        <TableHead className="text-right">Pageviews</TableHead>
                                        <TableHead className="text-right">Bounce Rate</TableHead>
                                        <TableHead className="text-right">Avg. Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topPages?.data?.slice(0, 10).map((page) => (
                                        <TableRow key={page.value}>
                                            <TableCell className="font-medium">
                                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                    {page.value}
                                                </code>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(page.count)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {page.pageviews ? formatNumber(page.pageviews) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={
                                                    page.bounce_rate && page.bounce_rate > 70 ? 'destructive' :
                                                        page.bounce_rate && page.bounce_rate < 30 ? 'default' : 'secondary'
                                                }>
                                                    {page.bounce_rate ? formatPercentage(page.bounce_rate) : '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {page.time_on_page_seconds ?
                                                    formatDuration(page.time_on_page_seconds) :
                                                    '-'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    )) || (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">
                                                    <p className="text-muted-foreground">Loading page data...</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    )
}
