# Changelog

All notable changes to the Clickwise for WordPress plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-20

### Added
- **Initial Release**: First stable version of Clickwise for WordPress
- **Core Tracking Features**:
  - Automatic pageview tracking
  - Single Page Application (SPA) support with History API tracking
  - Configurable tracking for query parameters
  - JavaScript error tracking
  - Session replay support (optional)
- **Event Management System**:
  - Live recording mode with visual overlay
  - Smart CSS selector generation with limited depth
  - Human-readable event naming based on element attributes
  - Event organization across three tabs: Tracked, Ignored, and History
  - Session-based recording history with timestamps
  - Bulk actions for efficient event management
  - Event remapping/aliasing for custom event names
- **Admin Interface**:
  - Tabbed settings interface (General, Tracking, Events & Forms, Event Manager, Advanced)
  - Test Connection functionality for script URL verification
  - Admin Bar integration with recording controls
  - Real-time event display in live recording overlay
- **Developer Features**:
  - Development Mode with visual event notifications
  - Configurable debounce settings (default: 500ms)
  - URL pattern skipping and masking
  - Custom event prefix configuration
  - Comprehensive AJAX-powered Event Manager
- **Form & Link Tracking**:
  - Automatic form submission tracking
  - Outbound link click tracking
- **Performance Optimizations**:
  - Event deduplication to prevent duplicates
  - Async script loading
  - Efficient localStorage management
  - Minimal JavaScript footprint

### Core Features
- Full WordPress integration with standard hooks and filters
- GPLv2 license compliance
- Complete copyright and attribution headers
- Comprehensive error handling for localStorage and JSON operations

### Technical Details
- PHP 7.4+ compatibility
- WordPress 5.0+ compatibility  
- Tested up to WordPress 6.4
- Clean, well-documented codebase
- Security best practices (nonce verification, capability checks, data sanitization)

---

## [Unreleased]

### Planned
- WordPress.org plugin repository submission
- Additional event types (scroll depth, video tracking)
- Enhanced session replay controls
- Export/Import functionality for event configurations
- Multi-site support
- WooCommerce integration
- Advanced filtering options for Event Manager

---

**Format Reference:**
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

**Legend:**
[Version Number] - Release Date
