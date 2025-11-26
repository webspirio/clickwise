import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { ThemeProvider } from "@/components/theme-provider"
import { SettingsProvider } from "@/contexts/SettingsContext"

const rootElement = document.getElementById('clickwise-admin-app')
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <SettingsProvider>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <App />
                </ThemeProvider>
            </SettingsProvider>
        </React.StrictMode>,
    )
}
