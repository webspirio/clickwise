import { RybbitOverview, RybbitMetricResponse } from './api';

export const getMockRybbitOverview = (): RybbitOverview => {
    return {
        sessions: 12453,
        pageviews: 45231,
        users: 8540,
        pages_per_session: 3.63,
        bounce_rate: 42.5,
        session_duration: 185, // 3m 5s
    };
};

export const getMockRybbitMetric = (parameter: string): RybbitMetricResponse => {
    switch (parameter) {
        case 'pathname':
            return {
                totalCount: 5,
                data: [
                    { value: '/', count: 15234, percentage: 33.7, pageviews: 45231, time_on_page_seconds: 120, bounce_rate: 35.5 },
                    { value: '/pricing', count: 8540, percentage: 18.9, pageviews: 12540, time_on_page_seconds: 180, bounce_rate: 25.0 },
                    { value: '/features', count: 6200, percentage: 13.7, pageviews: 9500, time_on_page_seconds: 150, bounce_rate: 45.0 },
                    { value: '/blog', count: 4500, percentage: 9.9, pageviews: 8000, time_on_page_seconds: 240, bounce_rate: 60.5 },
                    { value: '/about', count: 3200, percentage: 7.1, pageviews: 4000, time_on_page_seconds: 90, bounce_rate: 55.0 },
                ]
            };
        case 'country':
            return {
                totalCount: 5,
                data: [
                    { value: 'United States', count: 12500, percentage: 45.0 },
                    { value: 'United Kingdom', count: 5400, percentage: 19.4 },
                    { value: 'Germany', count: 3200, percentage: 11.5 },
                    { value: 'France', count: 2100, percentage: 7.5 },
                    { value: 'Canada', count: 1800, percentage: 6.5 },
                ]
            };
        case 'device_type':
            return {
                totalCount: 3,
                data: [
                    { value: 'Mobile', count: 18500, percentage: 55.0 },
                    { value: 'Desktop', count: 12400, percentage: 37.0 },
                    { value: 'Tablet', count: 2600, percentage: 7.7 },
                ]
            };
        case 'browser':
            return {
                totalCount: 4,
                data: [
                    { value: 'Chrome', count: 22000, percentage: 65.0 },
                    { value: 'Safari', count: 6500, percentage: 19.3 },
                    { value: 'Firefox', count: 3200, percentage: 9.5 },
                    { value: 'Edge', count: 1500, percentage: 4.4 },
                ]
            };
        default:
            return {
                totalCount: 0,
                data: []
            };
    }
};
