import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { ThemeProvider } from "@/components/theme-provider"
import { SettingsProvider } from "@/contexts/SettingsContext"

import { RybbitSDK } from './lib/rybbit-sdk'

const rootElement = document.getElementById('clickwise-admin-app')
if (rootElement) {
    // Initialize Rybbit SDK
    RybbitSDK.init();

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
