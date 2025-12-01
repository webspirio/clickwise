import rybbit from "@rybbit/js";
import { getRybbitApiBaseUrl, normalizeSettings, isRybbitEnabled } from "./settings";
import { logger } from "./logger";

export class RybbitSDK {
    private static isInitialized = false;
    private static isEnabled = false;

    /**
     * Initialize the Rybbit SDK with configuration from WordPress settings
     */
    public static async init(): Promise<void> {
        if (this.isInitialized) {
            logger.warn("Rybbit SDK is already initialized", { context: 'Rybbit' });
            return;
        }

        const settings = window.clickwiseSettings;

        // Check if Rybbit is enabled in settings
        if (!isRybbitEnabled(settings)) {
            logger.info("Rybbit Analytics is disabled in settings", { context: 'Rybbit' });
            return;
        }

        this.isEnabled = true;

        const normalized = normalizeSettings(settings);
        const analyticsHost = getRybbitApiBaseUrl(settings);
        const siteId = normalized.clickwise_rybbit_website_id || normalized.clickwise_rybbit_site_id;

        if (!siteId) {
            logger.error("Rybbit SDK: Site ID is required but not configured", undefined, { context: 'Rybbit' });
            this.isEnabled = false;
            return;
        }

        const config = {
            analyticsHost,
            siteId,
        };

        logger.sdkInit('Rybbit', config);

        try {
            await rybbit.init(config);
            this.isInitialized = true;
            logger.sdkSuccess('Rybbit');
        } catch (error) {
            logger.sdkError('Rybbit', error);
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
