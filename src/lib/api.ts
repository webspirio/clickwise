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

const getHeaders = (contentType = 'application/json') => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }
    return {
        'Content-Type': contentType,
        'X-WP-Nonce': window.clickwiseSettings.restNonce,
    };
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
};

// Settings API
const getSettings = async () => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }

    const url = `${window.clickwiseSettings.restUrl}clickwise/v1/settings`;
    console.log('🔍 API: Getting settings from:', url);

    const response = await fetch(url, {
        headers: {
            'X-WP-Nonce': window.clickwiseSettings.restNonce,
        },
    });

    console.log('📥 API: Settings response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API: Settings fetch failed:', errorText);
        throw new Error('Failed to fetch settings');
    }

    const data = await response.json();
    console.log('📄 API: Settings loaded:', data);
    return data;
};

const saveSettings = async (settings: Record<string, any>) => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }

    const url = `${window.clickwiseSettings.restUrl}clickwise/v1/settings`;
    console.log('💾 API: Saving settings to:', url);
    console.log('📤 API: Settings to save:', settings);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.clickwiseSettings.restNonce,
        },
        body: JSON.stringify(settings),
    });

    console.log('📥 API: Save response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API: Settings save failed:', errorText);
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        throw new Error(errorData.message || 'Failed to save settings');
    }

    const data = await response.json();
    console.log('✅ API: Settings saved successfully:', data);
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
const sendTestEvent = async (eventName: string, properties: Record<string, any>, handlers: string[]) => {
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
const testHandler = async (handler: 'rybbit' | 'ga') => {
    const response = await fetch(getApiUrl(`test/${handler}`), {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
};

// Rybbit Analytics API
const getRybbitOverview = async (siteId: string, timeRange: TimeRange, filters?: RybbitFilter[]): Promise<RybbitOverview> => {
    const settings = await getSettings();
    const apiKey = settings.clickwise_rybbit_api_key;
    const baseUrl = settings.clickwise_rybbit_script_url?.replace('/api/script.js', '') || 'https://api.rybbit.com';

    // API key is only required for cloud instances (app.rybbit.io)
    const isCloudInstance = baseUrl.includes('app.rybbit.io') || baseUrl.includes('api.rybbit.com');
    if (isCloudInstance && !apiKey) {
        throw new Error('Rybbit API key required for cloud instance. Please check your settings.');
    }

    const params = new URLSearchParams();

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

    // Prepare headers - include Authorization only for cloud instances with API key
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (apiKey && apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/api/overview/${siteId}?${params.toString()}`, {
        headers,
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait and try again.');
        }
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your Rybbit settings.');
        }
        if (response.status === 403) {
            throw new Error('Access denied. Please check your site permissions.');
        }
        throw new Error(`Failed to fetch analytics data: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
};

const getRybbitMetric = async (
    siteId: string,
    parameter: string,
    timeRange: TimeRange,
    options?: {
        filters?: RybbitFilter[];
        limit?: number;
        page?: number;
    }
): Promise<RybbitMetricResponse> => {
    const settings = await getSettings();
    const apiKey = settings.clickwise_rybbit_api_key;
    const baseUrl = settings.clickwise_rybbit_script_url?.replace('/api/script.js', '') || 'https://api.rybbit.com';

    // API key is only required for cloud instances (app.rybbit.io)
    const isCloudInstance = baseUrl.includes('app.rybbit.io') || baseUrl.includes('api.rybbit.com');
    if (isCloudInstance && !apiKey) {
        throw new Error('Rybbit API key required for cloud instance. Please check your settings.');
    }

    const params = new URLSearchParams();
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

    // Prepare headers - include Authorization only for cloud instances with API key
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (apiKey && apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/api/metric/${siteId}?${params.toString()}`, {
        headers,
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait and try again.');
        }
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your Rybbit settings.');
        }
        if (response.status === 403) {
            throw new Error('Access denied. Please check your site permissions.');
        }
        throw new Error(`Failed to fetch metric data: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
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
    getRybbitOverview,
    getRybbitMetric,
    createTimeRange,
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
    TimeRange,
    RybbitFilter,
};
