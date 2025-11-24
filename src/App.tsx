
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'

import { Settings } from '@/pages/Settings'

import { EventsManager } from '@/pages/EventsManager'
import { Sandbox } from '@/pages/Sandbox'

// Placeholder pages
const RybbitSettings = () => <div className="p-6">Rybbit Settings Content</div>

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
            default: return <div className="p-6">Content for {activeTab}</div>
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <div className="flex flex-1">
                <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
                <main className="flex-1 bg-muted/10">
                    {renderContent()}
                </main>
            </div>
        </div>
    )
}

export default App
