=== Clickwise ===
Contributors: webspirio
Donate link: https://webspirio.com/
Tags: analytics, tracking, events, forms, privacy
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect your WordPress site to Rybbit Analytics for privacy-focused event tracking and comprehensive user behavior insights.

## Description

**Important: This plugin requires a Rybbit Analytics instance (self-hosted or managed service).**

Clickwise for WordPress is a powerful, user-friendly plugin that seamlessly integrates Rybbit's analytics platform with your WordPress site. Built by **Webspirio**, this plugin provides comprehensive tracking capabilities with an advanced Event Manager for monitoring and managing user interactions.

**Third-Party Integration Notice:** This is an unofficial integration plugin developed by Webspirio, not an official Rybbit Analytics plugin. For more information about Rybbit Analytics, visit: [https://rybbit.com](https://rybbit.com)

= External Service Requirement =

**This plugin connects to an external Rybbit Analytics service.**

* **Service URL**: You must provide your own Rybbit Analytics instance (self-hosted or managed)
* **Data Sent**: User interactions, pageviews, custom events, form submissions as configured by you
* **Privacy**: Analytics data is sent to YOUR Rybbit instance, NOT to the plugin developers
* **Control**: You have full control over what data is collected and where it's stored
* **Terms**: Refer to your Rybbit instance provider's terms of service

For more information about Clickwise, visit: [https://clickwise.com](https://clickwise.com)

Learn more about the service:
* Clickwise: [https://clickwise.com](https://clickwise.com)
* Documentation: [https://clickwise.com/docs](https://clickwise.com/docs)

By installing, activating, and configuring this plugin with your Clickwise instance details, you consent to sending analytics data to your specified Clickwise server.

= Key Features =

**Comprehensive Tracking**

* Automatic pageview tracking
* Single Page Application (SPA) support
* Custom event tracking with configurable prefixes
* Form submission tracking
* Outbound link tracking
* JavaScript error tracking

**Advanced Event Manager**

* **Live Recording Mode**: Capture user interactions in real-time with a visual overlay
* **Smart Selectors**: Automatically generates concise, human-readable CSS selectors
* **Event Organization**: Manage events across three tabs (Tracked, Ignored, History)
* **Session Management**: Group events by recording session with timestamps
* **Bulk Actions**: Efficiently manage multiple events at once
* **Event Remapping**: Assign custom aliases to events for better analytics clarity

**Developer-Friendly**

* **Development Mode**: Visual debugging with event notifications
* **Test Connection**: Verify your Clickwise script URL directly from the admin panel
* **Session Replay**: Optional session replay recording (requires compatible Clickwise instance)
* **Flexible Configuration**: URL patterns for masking and skipping
* **Admin Bar Integration**: Quick access to recording controls from any page

**Performance Optimized**

* Configurable debounce settings
* Efficient event deduplication
* Minimal JavaScript footprint
* Async script loading

= Who is this for? =

* **Marketers** who need detailed insights into user behavior
* **Developers** building data-driven WordPress applications
* **Agencies** managing multiple WordPress sites with Clickwise
* **Site Owners** who want privacy-focused analytics with full control

== Installation ==

= From WordPress.org =

1. Install the plugin through the WordPress plugins screen
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Navigate to **Settings > Clickwise** to configure

= From GitHub =

1. Download the latest release from [GitHub](https://github.com/webspirio/clickwise-wp)
2. Upload the `clickwise-wp` folder to `/wp-content/plugins/`
3. Activate the plugin through the 'Plugins' menu in WordPress
4. Navigate to **Settings > Clickwise** to configure

= Initial Setup =

1. Go to **Settings > Clickwise > General**
2. Enter your **Script URL** (provided by your Clickwise instance)
3. Enter your **Site ID** (found in your Clickwise dashboard)
4. Click **Test Connection** to verify the setup
5. Save your settings

== Frequently Asked Questions ==

= What is Clickwise? =

Clickwise is a privacy-focused analytics platform. This plugin connects your WordPress site to your Clickwise instance to track user interactions and behavior.

= Do I need a Clickwise instance? =

Yes, you need either a self-hosted Rybbit Analytics instance or access to a managed Rybbit service. The plugin cannot function without connecting to a Rybbit server.

= Does this plugin send data to the plugin developers? =

No. All analytics data is sent exclusively to YOUR Rybbit Analytics instance that you configure in the settings. The plugin developers have no access to your data.

= Can I use this alongside Google Analytics or other analytics tools? =

Yes! This plugin works alongside other analytics solutions without conflicts. However, this plugin only sends data to Clickwise—not to Google Analytics or other platforms.

= How are events recorded? =

Events are captured via JavaScript and can be managed through the Event Manager. You have full control over which events are tracked, ignored, or renamed.

= Is this plugin GDPR compliant? =

The plugin itself doesn't store personal data. GDPR compliance depends on your Clickwise instance configuration and your privacy policy. You control what data is collected and where it's stored.

= Can I contribute to this plugin? =

Absolutely! Visit our [GitHub repository](https://github.com/webspirio/clickwise-wp) and submit pull requests or report issues.

= Where can I get support? =

* GitHub Issues: [https://github.com/webspirio/clickwise-wp/issues](https://github.com/webspirio/clickwise-wp/issues)
* Email: contact@webspirio.com
* Documentation: [https://clickwise.com/docs](https://clickwise.com/docs)

== Screenshots ==

1. **General Settings** - Configure your Clickwise instance connection with test functionality
2. **Event Manager** - Manage tracked events with an intuitive tabbed interface
3. **Live Recording Overlay** - Real-time event visualization during recording sessions
4. **Recording History** - Review past sessions and event details with session management
5. **Admin Bar Integration** - Quick access to recording controls from any page

== Changelog ==

= 1.0.0 (2025-11-20) =

**Added**

* Initial release
* Comprehensive tracking code integration (pageviews, SPA, events, forms, links)
* Advanced Event Manager with live recording mode
* Smart CSS selector generation for event tracking
* Human-readable event naming based on element attributes
* Session management and recording history
* Bulk actions for efficient event management
* Event remapping/aliasing for custom analytics names
* Development Mode with visual debugging
* Test Connection functionality for script URL validation
* Admin Bar integration with recording controls
* Live recording overlay with real-time event display
* Tabbed admin interface (General, Tracking, Events & Forms, Event Manager, Advanced)
* Configurable event prefixes for custom tracking
* URL pattern skipping and masking for privacy
* Debounce configuration for performance optimization
* Session replay support (optional, requires compatible Clickwise instance)
* Full AJAX-powered Event Manager
* Event organization (Tracked, Ignored, History tabs)
* GPLv2 license compliance with full source code availability

== Upgrade Notice ==

= 1.0.0 =
Initial release of Clickwise for WordPress by Webspirio. Full-featured analytics integration with advanced event management.

== External Services ==

This plugin connects to an external service - your Rybbit Analytics instance.

**Service Provider**: Your self-hosted or managed Rybbit Analytics instance
**Service Purpose**: To send and store analytics data about your website visitors and their interactions
**Data Transmitted**: 
* Pageviews (URLs, titles, referrers)
* Custom events (user interactions like clicks, form submissions)
* User behavior data (as configured in plugin settings)

**Privacy & Control**:
* You choose which Clickwise instance to connect to
* You control what data is collected through plugin settings
* Analytics data goes to YOUR server/service, not to plugin developers
* You are responsible for compliance with your Clickwise provider's terms

**Service Activation**: 
By entering your Clickwise instance details (Script URL and Site ID) in the plugin settings and activating tracking, you consent to sending data to the configured Clickwise service.

For Clickwise service information, visit: [https://clickwise.com](https://clickwise.com)

== Privacy Policy ==

This plugin:
* Does NOT collect or store any data locally in WordPress
* Does NOT send any data to the plugin developers
* Sends analytics data to YOUR configured Rybbit Analytics instance
* You are responsible for your own privacy policy regarding data collection

Ensure your site's privacy policy discloses:
* That you use analytics tracking
* What data is collected
* Where data is sent (your Clickwise instance)
* Your Clickwise provider's data handling practices

== Developer Notes ==

**Hooks & Filters**

Actions:
* `clickwise_before_tracking_code` - Fires before the tracking script is output
* `clickwise_after_tracking_code` - Fires after the tracking script is output

Filters:
* `clickwise_script_attributes` - Modify tracking script attributes
* `clickwise_skip_patterns` - Programmatically add URL skip patterns
* `clickwise_mask_patterns` - Programmatically add URL mask patterns

**JavaScript API**

The plugin exposes a configuration object:

`console.log(clickwise_config);`

Available properties:
* `prefixes` - Array of event prefixes
* `track_forms` - Boolean
* `track_links` - Boolean
* `dev_mode` - Boolean
* `recording_mode` - Boolean
* `managed_events` - Array of tracked events

== Credits ==

**Developed by Webspirio**  
Oleksandr Chornous - [contact@webspirio.com](mailto:contact@webspirio.com)  
Website: [https://webspirio.com](https://webspirio.com)

Made with ❤️ for the WordPress community.
