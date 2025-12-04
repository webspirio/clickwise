/**
 * Centralized settings management for Clickwise
 *
 * This module provides a consistent interface for accessing settings
 * regardless of whether they come from window.clickwiseSettings (PHP localized)
 * or from the REST API.
 */

export interface ClickwiseSettings {
    // REST API URLs and auth
    restUrl?: string;
    restNonce?: string;
    ajaxUrl?: string;
    nonce?: string;

    // UI state
    activeTab?: string;
    scriptUrl?: string;
    siteId?: string;

    // Rybbit Analytics settings
    clickwise_rybbit_enabled?: string;
    clickwise_rybbit_site_id?: string;
    clickwise_rybbit_script_url?: string;
    clickwise_rybbit_api_version?: string;
    clickwise_rybbit_api_key?: string;
    clickwise_rybbit_domain?: string;
    clickwise_rybbit_script_path?: string;
    clickwise_rybbit_tracking_id?: string;
    clickwise_rybbit_website_id?: string;

    // Google Analytics settings
    clickwise_ga_enabled?: string;
    clickwise_ga_measurement_id?: string;
    clickwise_ga_api_secret?: string;

    // Legacy/PHP localized settings (without clickwise_ prefix)
    // These are mapped to the prefixed versions for backwards compatibility
    rybbitEnabled?: string;
    rybbitSiteId?: string;
    rybbitScriptUrl?: string;
    rybbitApiVersion?: string;
    rybbitApiKey?: string;
    rybbitDomain?: string;
    rybbitScriptPath?: string;
    rybbitTrackingId?: string;
    rybbitWebsiteId?: string;
    gaEnabled?: string;
    gaMeasurementId?: string;
    gaApiSecret?: string;

    // Managed events
    managed_events?: Array<Record<string, unknown>>;
}

/**
 * Get a setting value, checking both prefixed and non-prefixed keys
 * This ensures compatibility with both PHP localized settings and REST API settings
 */
function getSetting(
    settings: Partial<ClickwiseSettings>,
    prefixedKey: keyof ClickwiseSettings,
    legacyKey: keyof ClickwiseSettings
): string | undefined {
    return (settings[prefixedKey] || settings[legacyKey]) as string | undefined;
}

/**
 * Normalize settings to always use the prefixed format
 * This takes settings from any source and returns a consistent format
 */
export function normalizeSettings(settings: Partial<ClickwiseSettings>): ClickwiseSettings {
    return {
        // Preserve REST API fields
        restUrl: settings.restUrl,
        restNonce: settings.restNonce,
        ajaxUrl: settings.ajaxUrl,
        nonce: settings.nonce,

        // Rybbit Analytics - normalize to prefixed format
        clickwise_rybbit_enabled: getSetting(settings, 'clickwise_rybbit_enabled', 'rybbitEnabled'),
        clickwise_rybbit_site_id: getSetting(settings, 'clickwise_rybbit_site_id', 'rybbitSiteId'),
        clickwise_rybbit_script_url: getSetting(settings, 'clickwise_rybbit_script_url', 'rybbitScriptUrl'),
        clickwise_rybbit_api_version: getSetting(settings, 'clickwise_rybbit_api_version', 'rybbitApiVersion'),
        clickwise_rybbit_api_key: getSetting(settings, 'clickwise_rybbit_api_key', 'rybbitApiKey'),
        clickwise_rybbit_domain: getSetting(settings, 'clickwise_rybbit_domain', 'rybbitDomain'),
        clickwise_rybbit_script_path: getSetting(settings, 'clickwise_rybbit_script_path', 'rybbitScriptPath'),
        clickwise_rybbit_tracking_id: getSetting(settings, 'clickwise_rybbit_tracking_id', 'rybbitTrackingId'),
        clickwise_rybbit_website_id: getSetting(settings, 'clickwise_rybbit_website_id', 'rybbitWebsiteId'),

        // Google Analytics - normalize to prefixed format
        clickwise_ga_enabled: getSetting(settings, 'clickwise_ga_enabled', 'gaEnabled'),
        clickwise_ga_measurement_id: getSetting(settings, 'clickwise_ga_measurement_id', 'gaMeasurementId'),
        clickwise_ga_api_secret: getSetting(settings, 'clickwise_ga_api_secret', 'gaApiSecret'),

        // Managed events
        managed_events: settings.managed_events || [],
    };
}

/**
 * Get Rybbit API base URL from settings
 * Ensures /api is properly appended
 *
 * @param settings - Settings object (uses clickwise_rybbit_domain or rybbitDomain)
 * @returns Full API URL like "https://app.rybbit.io/api"
 */
export function getRybbitApiBaseUrl(settings: Partial<ClickwiseSettings>): string {
    const normalized = normalizeSettings(settings);
    // Use domain from settings, or default to app.rybbit.io
    // This matches the PHP default: get_option('clickwise_rybbit_domain', 'https://app.rybbit.io')
    const domain = normalized.clickwise_rybbit_domain || 'https://app.rybbit.io';

    // Handle various input formats:
    // - https://app.rybbit.io        → https://app.rybbit.io/api
    // - https://app.rybbit.io/       → https://app.rybbit.io/api
    // - https://app.rybbit.io/api    → https://app.rybbit.io/api
    // - https://app.rybbit.io/api/   → https://app.rybbit.io/api
    const cleanBase = domain.replace(/\/api\/?$/, '');
    return `${cleanBase}/api`;
}

/**
 * Get normalized global settings from window
 */
export function getGlobalSettings(): ClickwiseSettings {
    if (typeof window === 'undefined' || !window.clickwiseSettings) {
        return {};
    }
    return normalizeSettings(window.clickwiseSettings);
}

/**
 * Check if Rybbit is enabled
 */
export function isRybbitEnabled(settings: Partial<ClickwiseSettings>): boolean {
    const normalized = normalizeSettings(settings);
    return normalized.clickwise_rybbit_enabled === '1' || normalized.clickwise_rybbit_enabled === 'true';
}

/**
 * Check if Google Analytics is enabled
 */
export function isGAEnabled(settings: Partial<ClickwiseSettings>): boolean {
    const normalized = normalizeSettings(settings);
    return normalized.clickwise_ga_enabled === '1' || normalized.clickwise_ga_enabled === 'true';
}
