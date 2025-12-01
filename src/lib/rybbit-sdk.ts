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

            // Setup automatic tracking for managed events
            this.setupAutomaticTracking(normalized.managed_events || []);
        } catch (error) {
            logger.sdkError('Rybbit', error);
            this.isEnabled = false;
        }
    }

    /**
     * Setup automatic tracking for managed events
     */
    private static setupAutomaticTracking(events: any[]): void {
        if (!events || events.length === 0) return;

        logger.info(`Setting up automatic tracking for ${events.length} events`, { context: 'Rybbit' });

        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Find closest clickable element
            const clickable = target.closest('a, button, input[type="submit"], input[type="button"]') as HTMLElement || target;

            events.forEach(event => {
                if (event.status !== 'tracked') return;

                // Check if element matches the selector
                try {
                    if (clickable.matches(event.selector)) {
                        const eventName = event.alias || event.name;
                        logger.info(`Tracked element clicked: ${eventName}`, { context: 'Rybbit' });

                        this.event(eventName, {
                            selector: event.selector,
                            text: clickable.innerText || '',
                            page: window.location.pathname
                        });
                    }
                } catch (err) {
                    // Ignore invalid selectors
                }
            });
        }, true);
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
