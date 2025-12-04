import rybbit from "@rybbit/js";
import { getRybbitApiBaseUrl, normalizeSettings, isRybbitEnabled } from "./settings";
import { logger } from "./logger";

// Type for sendBeacon data parameter
type BeaconData = Blob | ArrayBuffer | FormData | URLSearchParams | string | null;

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

        // Intercept sendBeacon to block admin pageviews
        if (navigator.sendBeacon) {
            const originalSendBeacon = navigator.sendBeacon;
            navigator.sendBeacon = function (url: string | URL, data: BeaconData) {
                // Check if the URL matches Rybbit analytics host
                if (typeof url === 'string' && url.includes(config.analyticsHost)) {
                    if (data instanceof Blob) {
                        // We need to peek into the blob to see if it's a pageview
                        // Note: This does not consume the blob for the original request if we pass it through
                        data.text().then(text => {
                            try {
                                const payload = JSON.parse(text);
                                // Check if it's a pageview in admin
                                if (payload.type === 'pageview' &&
                                    (payload.pathname.includes('/wp-admin/') || payload.pathname.includes('wp-login.php'))) {
                                    logger.info("Blocked Rybbit Admin Pageview", { context: 'Rybbit' });
                                    return; // Block the request
                                }

                                // If not blocked, we must send it ourselves because we are in an async callback
                                // and the original sendBeacon has already returned (simulated success).
                                // We use fetch with keepalive to mimic sendBeacon behavior.
                                fetch(url, {
                                    method: 'POST',
                                    body: text, // Send the text we read
                                    headers: { 'Content-Type': 'application/json' },
                                    keepalive: true
                                }).catch(err => {
                                    logger.error("Rybbit resend failed", err, { context: 'Rybbit' });
                                });

                            } catch {
                                // If parsing fails, fall back to original sendBeacon
                                // This might be a race condition if sendBeacon expects sync execution,
                                // but for fire-and-forget it's usually acceptable.
                                originalSendBeacon.call(navigator, url, data);
                            }
                        });

                        // Return true to simulate successful queuing
                        return true;
                    }
                }
                return originalSendBeacon.call(navigator, url, data);
            };
        }

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
    private static setupAutomaticTracking(events: Array<Record<string, unknown>>): void {
        if (!events || events.length === 0) return;

        logger.info(`Setting up automatic tracking for ${events.length} events`, { context: 'Rybbit' });

        document.addEventListener('click', (e) => {
            const target = e.target as Element;

            events.forEach(event => {
                if (event.status !== 'tracked') return;

                // Check if element or any parent matches the selector
                try {
                    const matchedElement = target.closest(event.selector) as HTMLElement;
                    if (matchedElement) {
                        const eventName = event.alias || event.name;
                        logger.info(`Tracked element clicked: ${eventName}`, { context: 'Rybbit' });

                        this.event(eventName, {
                            selector: event.selector,
                            text: matchedElement.innerText || '',
                            page: window.location.pathname
                        });
                    }
                } catch {
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
    public static event(name: string, properties?: Record<string, unknown>): void {
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
