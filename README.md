# Rybbit Analytics for WordPress

**Contributors:** Webspirio, Oleksandr Chornous  
**Tags:** analytics, tracking, events, rybbit, webspirio  
**Requires at least:** 5.0  
**Tested up to:** 6.4  
**Requires PHP:** 7.4  
**Stable tag:** 1.0.0  
**License:** GPLv2 or later  
**License URI:** https://www.gnu.org/licenses/gpl-2.0.html

The ultimate Rybbit Analytics integration for WordPress. Track pageviews, custom events, form submissions, and more with an intuitive admin interface.

## Description

Rybbit Analytics for WordPress is a powerful, user-friendly plugin that seamlessly integrates Rybbit's analytics platform with your WordPress site. Built by **Webspirio**, this plugin provides comprehensive tracking capabilities with an advanced Event Manager for monitoring and managing user interactions.

### Key Features

✅ **Comprehensive Tracking**
- Automatic pageview tracking
- Single Page Application (SPA) support
- Custom event tracking with configurable prefixes
- Form submission tracking
- Outbound link tracking
- JavaScript error tracking

✅ **Advanced Event Manager**
- **Live Recording Mode**: Capture user interactions in real-time with a visual overlay
- **Smart Selectors**: Automatically generates concise, human-readable CSS selectors
- **Event Organization**: Manage events across three tabs (Tracked, Ignored, History)
- **Session Management**: Group events by recording session with timestamps
- **Bulk Actions**: Efficiently manage multiple events at once
- **Event Remapping**: Assign custom aliases to events for better analytics clarity

✅ **Developer-Friendly**
- **Development Mode**: Visual debugging with event notifications
- **Test Connection**: Verify your Rybbit script URL directly from the admin panel
- **Session Replay**: Optional session replay recording (requires compatible Rybbit instance)
- **Flexible Configuration**: URL patterns for masking and skipping
- **Admin Bar Integration**: Quick access to recording controls from any page

✅ **Performance Optimized**
- Configurable debounce settings
- Efficient event deduplication
- Minimal JavaScript footprint
- Async script loading

### Who is this for?

- **Marketers** who need detailed insights into user behavior
- **Developers** building data-driven WordPress applications
- **Agencies** managing multiple WordPress sites with Rybbit Analytics
- **Site Owners** who want privacy-focused analytics with full control

## Installation

### From GitHub

1. Download the latest release from [GitHub](https://github.com/webspirio/rybbit-wordpress-plugin)
2. Rename the extracted folder to `rybbit-wp`
3. Upload the `rybbit-wp` folder to `/wp-content/plugins/`
4. Activate the plugin through the 'Plugins' menu in WordPress
5. Navigate to **Settings > Rybbit Analytics** to configure

### Manual Installation

1. Upload the plugin files to the `/wp-content/plugins/rybbit-wp` directory
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Use the Settings > Rybbit Analytics screen to configure the plugin

## Configuration

### Initial Setup

1. Go to **Settings > Rybbit Analytics > General**
2. Enter your **Script URL** (provided by your Rybbit instance)
3. Enter your **Site ID** (found in your Rybbit dashboard)
4. Click **Test Connection** to verify the setup
5. Save your settings

### Tracking Options

Configure what data to track in the **Tracking** tab:
- Enable/disable pageview tracking
- Configure SPA support for single-page applications
- Include/exclude URL query parameters
- Enable JavaScript error tracking

### Event Configuration

In the **Events & Forms** tab:
- Define custom event prefixes (e.g., `kb-`, `wc-`, `custom-`)
- Enable automatic form submission tracking
- Enable outbound link tracking

### Advanced Settings

Fine-tune your tracking in the **Advanced** tab:
- Set URL patterns to skip or mask
- Configure debounce delay (default: 500ms)
- Enable session replay (high resource usage)
- Enable Development Mode for debugging

## Event Manager

The Event Manager is the heart of this plugin. Access it via **Settings > Rybbit Analytics > Event Manager**.

### Recording Events

1. Click **Start Recording** in the WordPress Admin Bar
2. Navigate your site and interact with elements (clicks, form submissions, etc.)
3. Watch events appear in the live recording overlay (bottom-right corner)
4. Click **Stop Recording** when done
5. Review captured events in the Event Manager

### Managing Events

- **Tracked Events**: Events that will be sent to Rybbit Analytics
- **Ignored Events**: Events that will be excluded from tracking
- **Recording History**: View all past recording sessions with event details

### Event Actions

- **Track/Ignore**: Change event status with one click
- **Rename**: Assign a user-friendly alias to any event
- **Bulk Actions**: Select multiple events and apply actions at once
- **Delete Session**: Remove entire recording sessions

## Screenshots

1. **General Settings** - Configure your Rybbit instance connection
<img width="831" height="502" alt="image" src="https://github.com/user-attachments/assets/1ec64ec0-2e2d-4353-bd33-5cab143b6f44" />

2. **Event Manager** - Manage tracked events with an intuitive interface
<img width="1183" height="562" alt="image" src="https://github.com/user-attachments/assets/87740e49-bd59-420f-94dc-09f03a6dec05" />

   
3. **Live Recording Overlay** - Real-time event visualization
4. **Recording History** - Review past sessions and event details
5. **Admin Bar Integration** - Quick access to recording controls

## Frequently Asked Questions

### What is Rybbit Analytics?

Rybbit is a privacy-focused analytics platform. This plugin connects your WordPress site to your Rybbit instance.

### Do I need a Rybbit account?

Yes, you need a Rybbit instance (self-hosted or managed) to use this plugin.

### Can I use this with Google Analytics or other analytics tools?

Yes! This plugin works alongside other analytics solutions.

### How are events recorded?

Events are captured via JavaScript and can be managed through the Event Manager. You have full control over which events are tracked.

### Is this plugin GDPR compliant?

The plugin itself doesn't store personal data. Compliance depends on your Rybbit instance configuration and your privacy policy.

### Can I contribute to this plugin?

Absolutely! Visit our [GitHub repository](https://github.com/webspirio/rybbit-wordpress-plugin) and submit pull requests or report issues.

## Changelog

### 1.0.0 (2025-11-20)
#### Added
- Initial release
- Comprehensive tracking code integration (pageviews, SPA, events, forms, links)
- Advanced Event Manager with live recording mode
- Smart CSS selector generation
- Human-readable event naming
- Session management and recording history
- Bulk actions for event management
- Event remapping/aliasing
- Development Mode with visual debugging
- Test Connection functionality
- Admin Bar integration with recording controls
- Live recording overlay with real-time event display
- Support for GPLv2 license

#### Core Features
- Tabbed admin interface (General, Tracking, Events & Forms, Event Manager, Advanced)
- Configurable event prefixes
- URL pattern skipping and masking
- Debounce configuration
- Session replay support (optional)
- Full AJAX-powered Event Manager
- Tracked, Ignored, and History event organization

## Upgrade Notice

### 1.0.0
Initial release of Rybbit Analytics for WordPress by Webspirio.

## Developer Documentation

### Hooks and Filters

The plugin provides several WordPress hooks for customization:

#### Actions
- `rybbit_before_tracking_code` - Fires before the tracking script is output
- `rybbit_after_tracking_code` - Fires after the tracking script is output

#### Filters
- `rybbit_script_attributes` - Modify tracking script attributes
- `rybbit_skip_patterns` - Programmatically add URL skip patterns
- `rybbit_mask_patterns` - Programmatically add URL mask patterns

### JavaScript API

The plugin exposes a configuration object for frontend use:

```javascript
// Access configuration
console.log(rybbit_config);

// Available properties:
// - prefixes: Array of event prefixes
// - track_forms: Boolean
// - track_links: Boolean
// - dev_mode: Boolean
// - recording_mode: Boolean
// - managed_events: Array of tracked events
```

## Support

- **Documentation:** [Rybbit Documentation](https://rybbit.com/docs)
- **Issues:** [GitHub Issues](https://github.com/webspirio/rybbit-wordpress-plugin/issues)
- **Contact:** [contact@webspirio.com](mailto:contact@webspirio.com)
- **Website:** [webspirio.com](https://webspirio.com)

## Credits

**Developed by Webspirio**  
Oleksandr Chornous - [contact@webspirio.com](mailto:contact@webspirio.com)

## License

This plugin is licensed under the GPLv2 (or later).

```
Copyright (c) 2025 Webspirio

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
```

---

**Made with ❤️ by [Webspirio](https://webspirio.com)**
