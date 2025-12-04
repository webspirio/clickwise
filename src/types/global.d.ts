import type { ClickwiseSettings } from '@/lib/settings';

export { };

declare global {
    interface Window {
        clickwiseSettings: ClickwiseSettings;
        RybbitSDK: typeof import('@/lib/rybbit-sdk').RybbitSDK;
    }
}
