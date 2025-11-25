import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Users, MousePointer2, Activity, Clock, Loader2 } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, type DashboardStats, type ChartDataPoint, type ActivityItem } from "@/lib/api"

export function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [chartData, setChartData] = useState<ChartDataPoint[]>([])
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
    const [chartPeriod] = useState('7d')

    useEffect(() => {
        loadDashboardData()
    }, [])

    useEffect(() => {
        if (!loading) {
            loadChartData()
        }
    }, [chartPeriod, loading])

    const loadDashboardData = async () => {
        try {
            setLoading(true)
            setError(null)
            const [statsData, chartData, activityData] = await Promise.all([
                api.getDashboardStats(),
                api.getDashboardChart('7d'),
                api.getDashboardActivity(4)
            ])
            setStats(statsData)
            setChartData(chartData)
            setRecentActivity(activityData)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }

    const loadChartData = async () => {
        try {
            const data = await api.getDashboardChart(chartPeriod)
            setChartData(data)
        } catch (err) {
            console.error('Failed to load chart data:', err)
        }
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num)
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
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Overview of your site's performance and user interactions.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
                        Download Report
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Events
                        </CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats ? formatNumber(stats.total_events) : '...'}</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +20.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats ? `+${formatNumber(stats.active_users)}` : '...'}</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +180.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Click Rate
                        </CardTitle>
                        <MousePointer2 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.click_rate || '...'}</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +19% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Avg. Session
                        </CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.avg_session || '...'}</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +7% from last month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>
                            Traffic and engagement trends over the last 7 days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                    />
                                    <Area type="monotone" dataKey="visits" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorVisits)" />
                                    <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest tracked events on your site.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((item, i) => {
                                    // Map icon names to icon components
                                    const iconMap: Record<string, React.ComponentType<any>> = {
                                        MousePointer2,
                                        Activity,
                                        Users,
                                        ArrowUpRight,
                                        Clock
                                    };
                                    const IconComponent = iconMap[item.icon] || Activity;

                                    return (
                                        <div key={i} className="flex items-center">
                                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${item.bg} ${item.color} mr-4`}>
                                                <IconComponent className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-none">{item.event}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.user} • {item.time}
                                                </p>
                                            </div>
                                            <div className="ml-auto font-medium text-xs text-muted-foreground">
                                                Tracked
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
