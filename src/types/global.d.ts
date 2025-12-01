import type { ClickwiseSettings } from '@/lib/settings';

export { };

declare global {
    interface Window {
        clickwiseSettings: ClickwiseSettings;
        RybbitSDK: any;
    }
}
