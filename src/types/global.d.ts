export { };

declare global {
    interface Window {
        clickwiseSettings: {
            ajaxUrl: string;
            nonce: string;
            restUrl: string;
            restNonce: string;
            scriptUrl: string;
            siteId: string;
            currentUser: any;
            activeTab: string;
            rybbitEnabled: string; // '1' or ''
            rybbitScriptUrl: string;
            rybbitSiteId: string;
            rybbitDomain: string;
            rybbitScriptPath: string;
            rybbitTrackingId: string;
            rybbitWebsiteId: string;
            gaEnabled: string; // '1' or ''
        };
        RybbitSDK: any;
    }
}
