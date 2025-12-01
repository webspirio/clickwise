import rybbit from "@rybbit/js";

export class RybbitSDK {
    private static isInitialized = false;
    private static isEnabled = false;

    /**
     * Initialize the Rybbit SDK with configuration from WordPress settings
     */
    public static async init(): Promise<void> {
        if (this.isInitialized) {
            console.warn("Rybbit SDK is already initialized.");
            return;
        }

        const settings = window.clickwiseSettings;

        // Check if Rybbit is enabled in settings
        if (!settings.rybbitEnabled) {
            console.log("Rybbit Analytics is disabled in settings.");
            return;
        }

        this.isEnabled = true;

        let analyticsHost = settings.rybbitDomain || "https://api.rybbit.io/api";

        // Ensure analyticsHost ends with /api if it's not the default cloud instance
        // (Assuming cloud instance is handled correctly or user provides full URL)
        // But based on user error, they provided domain without /api.
        // Let's robustly handle this: if it doesn't end in /api, append it.
        if (analyticsHost && !analyticsHost.endsWith('/api')) {
            analyticsHost = `${analyticsHost.replace(/\/$/, '')}/api`;
        }

        const config = {
            analyticsHost: analyticsHost,
            siteId: settings.rybbitWebsiteId || settings.rybbitSiteId,
            // Optional: Add other configuration options here if needed
            // debug: process.env.NODE_ENV === 'development',
        };

        console.log("Rybbit SDK Init Debug:", {
            settings: settings,
            rybbitWebsiteId: settings.rybbitWebsiteId,
            rybbitSiteId: settings.rybbitSiteId,
            finalConfig: config
        });

        try {
            await rybbit.init(config);
            this.isInitialized = true;
            console.log("Rybbit SDK initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize Rybbit SDK:", error);
            this.isEnabled = false;
        }
    }

    /**
     * Track a pageview
     * @param path Optional path to override the current location
     */
    public static pageview(path?: string): void {
        if (!this.isEnabled) return;
        rybbit.pageview(path);
    }

    /**
     * Track a custom event
     * @param name Event name
     * @param properties Event properties
     */
    public static event(name: string, properties?: Record<string, any>): void {
        if (!this.isEnabled) return;
        rybbit.event(name, properties);
    }

    /**
     * Identify a user
     * @param userId User ID
     */
    public static identify(userId: string): void {
        if (!this.isEnabled) return;
        rybbit.identify(userId);
    }

    /**
     * Clear user identification
     */
    public static clearUserId(): void {
        if (!this.isEnabled) return;
        rybbit.clearUserId();
    }
}

// Expose to window for debugging and external use
window.RybbitSDK = RybbitSDK;
