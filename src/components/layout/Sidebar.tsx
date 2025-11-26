import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Settings, Activity, Box, FileText } from "lucide-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    activeTab: string
    onTabChange: (tab: string) => void
}

export function Sidebar({ className, activeTab, onTabChange }: SidebarProps) {
    const navItems = [
        { id: 'general', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'events', label: 'Events & Forms', icon: FileText },
        { id: 'events_manager', label: 'Event Manager', icon: Activity },
        { id: 'sandbox', label: 'Sandbox', icon: Box },
    ]

    return (
        <div className={cn("pb-12 w-64 glass border-r-0", className)}>
            <div className="space-y-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Settings
                    </h2>
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <Button
                                key={item.id}
                                variant={activeTab === item.id ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => onTabChange(item.id)}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Integrations
                    </h2>
                    <div className="space-y-1">
                        <Button
                            variant={activeTab === 'rybbit' ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => onTabChange('rybbit')}
                        >
                            <span className={cn("mr-2 h-2 w-2 rounded-full", window.clickwiseSettings?.rybbitEnabled ? "bg-green-500" : "bg-gray-300")} />
                            Rybbit
                        </Button>
                        <Button
                            variant={activeTab === 'google_analytics' ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => onTabChange('google_analytics')}
                        >
                            <span className={cn("mr-2 h-2 w-2 rounded-full", window.clickwiseSettings?.gaEnabled ? "bg-green-500" : "bg-gray-300")} />
                            GA4
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
