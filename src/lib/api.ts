import { logger } from './logger';

// Types for API responses
type DashboardStats = {
    total_events: number;
    active_users: number;
    click_rate: string;
    avg_session: string;
};

// Rybbit API Types
type RybbitOverview = {
    sessions: number;
    pageviews: number;
    users: number;
    pages_per_session: number;
    bounce_rate: number;
    session_duration: number;
};

type RybbitMetricItem = {
    value: string;
    count: number;
    percentage: number;
    pageviews?: number;
    pageviews_percentage?: number;
    time_on_page_seconds?: number;
    bounce_rate?: number;
    pathname?: string;
};

type RybbitTrackingConfig = {
    sessionReplay: boolean;
    webVitals: boolean;
    trackErrors: boolean;
    trackOutbound: boolean;
    trackUrlParams: boolean;
    trackInitialPageView: boolean;
    trackSpaNavigation: boolean;
};

type RybbitMetricResponse = {
    data: RybbitMetricItem[];
    totalCount: number;
};

type TimeRange = {
    start_date?: string;
    end_date?: string;
    time_zone?: string;
    past_minutes_start?: number;
    past_minutes_end?: number;
};

type RybbitFilter = {
    parameter: string;
    type: 'equals' | 'not_equals' | 'contains' | 'not_contains';
    value: (string | number)[];
};

type ChartDataPoint = {
    name: string;
    visits: number;
    clicks: number;
};

type ActivityItem = {
    event: string;
    time: string;
    user: string;
    icon: string;
    color: string;
    bg: string;
};

type Event = {
    id: string;
    key: string;
    type: string;
    name: string;
    alias?: string;
    selector?: string;
    status: 'tracked' | 'ignored' | 'pending';
    first_seen: string;
    last_seen: string;
    example_detail?: string;
    session_id?: string;
    session_timestamp?: string;
};

type EventsResponse = {
    tracked: Event[];
    ignored: Event[];
    sessions: {
        id: string;
        timestamp: string;
        events: Event[];
    }[];
};

// Base API utility functions
const getApiUrl = (endpoint: string) => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }
    return `${window.clickwiseSettings.restUrl}clickwise/v1/${endpoint}`;
};

const getHeaders = (contentType = 'application/json'): Record<string, string> => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }
    const headers: Record<string, string> = {
        'Content-Type': contentType,
    };
    if (window.clickwiseSettings.restNonce) {
        headers['X-WP-Nonce'] = window.clickwiseSettings.restNonce;
    }
    return headers;
};

export class ApiError extends Error {
    data: unknown;
    constructor(message: string, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.data = data;
    }
}

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new ApiError(errorData.message || `HTTP ${response.status}`, errorData);
    }
    return response.json();
};

// Settings API
const getSettings = async () => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }

    const url = `${window.clickwiseSettings.restUrl}clickwise/v1/settings`;
    logger.apiRequest('GET', url);

    const headers: Record<string, string> = {};
    if (window.clickwiseSettings.restNonce) {
        headers['X-WP-Nonce'] = window.clickwiseSettings.restNonce;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    logger.apiResponse('GET', url, response.status, data);

    if (!response.ok) {
        throw new Error('Failed to fetch settings');
    }

    return data;
};

const saveSettings = async (settings: Record<string, unknown>) => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }

    const url = `${window.clickwiseSettings.restUrl}clickwise/v1/settings`;
    logger.apiRequest('POST', url, settings);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (window.clickwiseSettings.restNonce) {
        headers['X-WP-Nonce'] = window.clickwiseSettings.restNonce;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(settings),
    });

    const data = await response.json();
    logger.apiResponse('POST', url, response.status, data);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to save settings');
    }

    return data;
};

// Dashboard API
const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await fetch(getApiUrl('dashboard/stats'), {
        headers: getHeaders(),
    });
    return handleResponse(response);
};

const getDashboardChart = async (period = '7d'): Promise<ChartDataPoint[]> => {
    const response = await fetch(getApiUrl(`dashboard/chart?period=${period}`), {
        headers: getHeaders(),
    });
    return handleResponse(response);
};

const getDashboardActivity = async (limit = 10): Promise<ActivityItem[]> => {
    const response = await fetch(getApiUrl(`dashboard/activity?limit=${limit}`), {
        headers: getHeaders(),
    });
    return handleResponse(response);
};

// Events Management API
const getEvents = async (status = 'all', type = 'all'): Promise<EventsResponse> => {
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (type !== 'all') params.append('type', type);

    const response = await fetch(getApiUrl(`events?${params.toString()}`), {
        headers: getHeaders(),
    });
    return handleResponse(response);
};

const updateEvent = async (eventId: string, updates: { status?: string; alias?: string }) => {
    const response = await fetch(getApiUrl(`events/${eventId}`), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
};

const bulkUpdateEvents = async (eventIds: string[], action: 'track' | 'ignore' | 'delete') => {
    const response = await fetch(getApiUrl('events/bulk'), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ event_ids: eventIds, action }),
    });
    return handleResponse(response);
};

const deleteEvent = async (eventId: string) => {
    const response = await fetch(getApiUrl(`events/${eventId}`), {
        method: 'DELETE',
        headers: getHeaders(),
    });
    return handleResponse(response);
};

// Sandbox API
const sendTestEvent = async (eventName: string, properties: Record<string, unknown>, handlers: string[]) => {
    const response = await fetch(getApiUrl('sandbox/send'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            event_name: eventName,
            properties,
            handlers,
        }),
    });
    return handleResponse(response);
};

// Recording API
const toggleRecording = async () => {
    const response = await fetch(getApiUrl('recording/toggle'), {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
};

const getRecordingStatus = async () => {
    const response = await fetch(getApiUrl('recording/status'), {
        headers: getHeaders(),
    });
    return handleResponse(response);
};

// Test Handler API
const testHandler = async (handler: 'rybbit' | 'ga', config?: Record<string, unknown>) => {
    const response = await fetch(getApiUrl(`test/${handler}`), {
        method: 'POST',
        headers: getHeaders(),
        body: config ? JSON.stringify(config) : undefined,
    });
    return handleResponse(response);
};

// Rybbit Analytics API
// These calls now go through WordPress REST API proxy to keep API key secure

export const getRybbitOverview = async (siteId: string, timeRange: TimeRange, settings: Record<string, unknown>, filters?: RybbitFilter[]): Promise<RybbitOverview> => {
    const targetSiteId = siteId || settings.clickwise_rybbit_website_id;

    if (!targetSiteId) {
        throw new Error('Rybbit Website ID not configured');
    }

    const params = new URLSearchParams();
    params.append('site_id', targetSiteId);

    // Add time range parameters
    if (timeRange.start_date && timeRange.end_date && timeRange.time_zone) {
        params.append('start_date', timeRange.start_date);
        params.append('end_date', timeRange.end_date);
        params.append('time_zone', timeRange.time_zone);
    } else if (timeRange.past_minutes_start && timeRange.past_minutes_end !== undefined) {
        params.append('past_minutes_start', timeRange.past_minutes_start.toString());
        params.append('past_minutes_end', timeRange.past_minutes_end.toString());
    }

    // Add filters if provided
    if (filters && filters.length > 0) {
        params.append('filters', JSON.stringify(filters));
    }

    // Call WordPress proxy endpoint (API key stays server-side)
    const response = await fetch(getApiUrl(`rybbit/overview?${params.toString()}`), {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to fetch analytics data: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
};

const getRybbitMetric = async (
    siteId: string,
    parameter: string,
    timeRange: TimeRange,
    settings: Record<string, unknown>,
    options?: {
        filters?: RybbitFilter[];
        limit?: number;
        page?: number;
    }
): Promise<RybbitMetricResponse> => {
    const targetSiteId = siteId || settings.clickwise_rybbit_website_id;

    if (!targetSiteId) {
        throw new Error('Rybbit Website ID not configured');
    }

    const params = new URLSearchParams();
    params.append('site_id', targetSiteId);
    params.append('parameter', parameter);

    // Add time range parameters
    if (timeRange.start_date && timeRange.end_date && timeRange.time_zone) {
        params.append('start_date', timeRange.start_date);
        params.append('end_date', timeRange.end_date);
        params.append('time_zone', timeRange.time_zone);
    } else if (timeRange.past_minutes_start && timeRange.past_minutes_end !== undefined) {
        params.append('past_minutes_start', timeRange.past_minutes_start.toString());
        params.append('past_minutes_end', timeRange.past_minutes_end.toString());
    }

    // Add optional parameters
    if (options?.limit) {
        params.append('limit', options.limit.toString());
    }
    if (options?.page) {
        params.append('page', options.page.toString());
    }
    if (options?.filters && options.filters.length > 0) {
        params.append('filters', JSON.stringify(options.filters));
    }

    // Call WordPress proxy endpoint (API key stays server-side)
    const response = await fetch(getApiUrl(`rybbit/metric?${params.toString()}`), {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to fetch metric data: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
};

const getTrackingConfig = async (siteId: string, settings: Record<string, unknown>): Promise<RybbitTrackingConfig> => {
    const targetSiteId = siteId || settings.clickwise_rybbit_website_id;
    const domain = settings.clickwise_rybbit_domain || 'https://app.rybbit.io';

    if (!targetSiteId) {
        throw new Error('Rybbit Website ID not configured');
    }

    // Clean domain to ensure no trailing slash or /api suffix for this specific endpoint structure if needed,
    // but the requirement says https://rybbit.webspirio.com/api/site/1/tracking-config
    // So we need {domain}/api/site/{siteId}/tracking-config

    const cleanBase = domain.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const url = `${cleanBase}/api/site/${targetSiteId}/tracking-config`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch tracking config: ${response.status}`);
    }

    return response.json();
};

// Helper function to create time ranges
const createTimeRange = (preset: 'today' | 'week' | 'month' | '3months' | 'custom', customStart?: string, customEnd?: string): TimeRange => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    switch (preset) {
        case 'today':
            return {
                past_minutes_start: 24 * 60,
                past_minutes_end: 0
            };
        case 'week':
            return {
                past_minutes_start: 7 * 24 * 60,
                past_minutes_end: 0
            };
        case 'month':
            return {
                past_minutes_start: 30 * 24 * 60,
                past_minutes_end: 0
            };
        case '3months':
            return {
                past_minutes_start: 90 * 24 * 60,
                past_minutes_end: 0
            };
        case 'custom':
            if (!customStart || !customEnd) {
                throw new Error('Custom date range requires start and end dates');
            }
            return {
                start_date: customStart,
                end_date: customEnd,
                time_zone: timeZone
            };
        default:
            return {
                past_minutes_start: 7 * 24 * 60,
                past_minutes_end: 0
            };
    }
};

export const api = {
    // Settings
    getSettings,
    saveSettings,

    // Dashboard
    getDashboardStats,
    getDashboardChart,
    getDashboardActivity,

    // Events
    getEvents,
    updateEvent,
    bulkUpdateEvents,
    deleteEvent,

    // Sandbox
    sendTestEvent,

    // Recording
    toggleRecording,
    getRecordingStatus,

    // Testing
    testHandler,

    // Rybbit Analytics
    rybbit: {
        getOverview: getRybbitOverview,
        getMetric: getRybbitMetric,
        getTrackingConfig: getTrackingConfig,
        createTimeRange: createTimeRange,
    },
};

// Export types
export type {
    DashboardStats,
    ChartDataPoint,
    ActivityItem,
    Event,
    EventsResponse,
    RybbitOverview,
    RybbitMetricItem,
    RybbitMetricResponse,
    RybbitTrackingConfig,
    TimeRange,
    RybbitFilter,
};
