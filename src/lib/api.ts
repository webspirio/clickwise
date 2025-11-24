// Types for API responses
type DashboardStats = {
    total_events: number;
    active_users: number;
    click_rate: string;
    avg_session: string;
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

    const response = await fetch(`${window.clickwiseSettings.restUrl}wp/v2/settings`, {
        headers: {
            'X-WP-Nonce': window.clickwiseSettings.restNonce,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch settings');
    }

    return response.json();
};

const saveSettings = async (settings: Record<string, any>) => {
    if (!window.clickwiseSettings) {
        throw new Error('Clickwise settings not found');
    }

    const response = await fetch(`${window.clickwiseSettings.restUrl}wp/v2/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.clickwiseSettings.restNonce,
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
    }

    return response.json();
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
};

// Export types
export type {
    DashboardStats,
    ChartDataPoint,
    ActivityItem,
    Event,
    EventsResponse,
};
