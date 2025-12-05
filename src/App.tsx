
import { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/sonner"
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'

import { Settings } from '@/pages/Settings'

import { EventsManager } from '@/pages/EventsManager'
import { Sandbox } from '@/pages/Sandbox'

import { RybbitSettings } from '@/pages/Integrations/RybbitSettings'
import { GA4Settings } from '@/pages/Integrations/GA4Settings'

function App() {
    const [activeTab, setActiveTab] = useState(window.clickwiseSettings?.activeTab || 'general')

    // Update URL when tab changes (optional, for deep linking)
    useEffect(() => {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', activeTab)
        window.history.pushState({}, '', url)
    }, [activeTab])

    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <Dashboard />
            case 'settings': return <Settings />
            case 'events_manager': return <EventsManager />
            case 'sandbox': return <Sandbox />
            case 'rybbit': return <RybbitSettings />
            case 'google_analytics': return <GA4Settings />
            default: return <div className="p-6">Content for {activeTab}</div>
        }
    }

    return (
        <div className="relative h-[calc(100vh-var(--wp-admin--admin-bar--height,32px))] w-full overflow-hidden">
            <div className="absolute top-0 left-0 right-0 z-50">
                <Header />
            </div>
            <div className="absolute top-0 bottom-0 left-0 w-64 z-40 pt-[81px]">
                <Sidebar activeTab={activeTab} onTabChange={setActiveTab} className="h-full border-r-0" />
            </div>
            <main className="absolute inset-0 overflow-y-auto pt-[81px] pl-64 z-0">
                <div className="p-6">
                    {renderContent()}
                </div>
            </main>
            <Toaster />
        </div>
    )
}

export default App
