/**
 * Webspirio Rybbit Analytics Tracker
 * Author: Webspirio (Oleksandr Chornous)
 * Contact: contact@webspirio.com
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
(function () {
    'use strict';

    var config = window.rybbit_config || {};

    /**
     * Custom Event Tracking
     * Intercepts CustomEvent dispatch to track events with specific prefixes.
     */
    var originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
        if (event instanceof CustomEvent) {
            var shouldTrack = false;
            if (config.prefixes && Array.isArray(config.prefixes)) {
                config.prefixes.forEach(function (prefix) {
                    if (event.type.indexOf(prefix) === 0) {
                        shouldTrack = true;
                    }
                });

                if (shouldTrack) {
                    // Note: We rely on the global monkey patch in Dev Mode to log this
                    if (window.rybbit && typeof window.rybbit.event === 'function') {
                        window.rybbit.event(event.type, {
                            detail: typeof event.detail === 'object'
                                ? JSON.stringify(event.detail)
                                : String(event.detail || '')
                        });
                    }
                }
            }
        }
        return originalDispatchEvent.call(this, event);
    };

    /**
     * Form Submission Tracking
     */
    if (config.track_forms) {
        document.addEventListener('submit', function (e) {
            var form = e.target;
            var formName = form.getAttribute('name') || form.getAttribute('id') || 'unknown_form';
            var formClass = form.getAttribute('class') || '';

            if (window.rybbit && typeof window.rybbit.event === 'function') {
                window.rybbit.event('form_submit', {
                    form_name: formName,
                    form_class: formClass,
                    page: window.location.href
                });
            }
        }, true); // Capture phase
    }

    /**
     * Outbound Link Tracking
     */
    if (config.track_links) {
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a');
            if (link && link.href) {
                var url = new URL(link.href);
                if (url.hostname !== window.location.hostname) {
                    if (window.rybbit && typeof window.rybbit.event === 'function') {
                        window.rybbit.event('outbound_link_click', {
                            url: link.href,
                            text: link.innerText.trim()
                        });
                    }
                }
            }
        }, true);
    }

    /**
     * Managed Event Tracking
     * Checks if the current event matches a managed event rule.
     */
    function checkManagedEvents(type, name, detail) {
        if (!config.managed_events) return;

        config.managed_events.forEach(function (rule) {
            var match = false;
            if (rule.type === 'custom' && rule.name === name) match = true;
            if (rule.type === 'click' && detail.selector && detail.selector.indexOf(rule.selector) !== -1) match = true; // Simple match
            if (rule.type === 'form_submit' && rule.name === name) match = true;

            if (match) {
                if (window.rybbit && typeof window.rybbit.event === 'function') {
                    // Use alias if available, otherwise original name
                    var eventName = rule.alias || rule.name;
                    window.rybbit.event(eventName, detail);
                }
            }
        });
    }

    // Hook into interactions for Managed Events (if not recording, or even if recording)
    // We need listeners for managed events specifically if they aren't covered by standard tracking
    if (!config.recording_mode && config.managed_events && config.managed_events.length > 0) {
        document.addEventListener('click', function (e) {
            var target = e.target;
            // Use closest clickable element if target is not clickable
            var clickable = target.closest('a, button, input[type="submit"], input[type="button"]');
            if (clickable) target = clickable;

            var selector = getSelector(target);
            checkManagedEvents('click', 'Click: ' + selector, { selector: selector, text: target.innerText });
        }, true);
    }

    function getSelector(el) {
        if (!el || el.nodeType !== 1) return '';

        // 1. Check for specific ID
        if (el.id) return '#' + el.id;

        // 2. Check for specific attributes that make it unique-ish
        if (el.hasAttribute('data-rybbit-id')) return '[' + 'data-rybbit-id="' + el.getAttribute('data-rybbit-id') + '"]';
        if (el.getAttribute('name')) return el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';

        // 3. Walk up the DOM (limit depth for sanity)
        var path = [];
        var current = el;
        var depth = 0;
        var maxDepth = 4; // Don't go too deep

        while (current && current.nodeType === 1 && depth < maxDepth) {
            var selector = current.tagName.toLowerCase();

            if (current.id) {
                selector = '#' + current.id;
                path.unshift(selector);
                break; // Found an ID, stop here
            } else {
                var className = '';
                if (current.getAttribute) {
                    className = current.getAttribute('class') || '';
                }
                // Filter out common utility classes if needed, for now just use them
                // But maybe limit to first 2 classes to avoid massive strings
                if (className && typeof className === 'string' && className.trim().length > 0) {
                    var classes = className.trim().split(/\s+/);
                    if (classes.length > 0) {
                        selector += '.' + classes.slice(0, 2).join('.');
                    }
                }
                path.unshift(selector);
                current = current.parentNode;
                depth++;
            }
        }
        return path.join(' > ');
    }

    /**
     * Declarative Event Tracking
     * Listens for clicks on elements with data-rybbit-action attribute.
     */
    document.addEventListener('click', function (e) {
        var target = e.target.closest('[data-rybbit-action]');
        if (target) {
            var action = target.getAttribute('data-rybbit-action');
            var name = target.getAttribute('data-rybbit-name') || action;
            var detailRaw = target.getAttribute('data-rybbit-detail');
            var detail = {};

            if (detailRaw) {
                try {
                    detail = JSON.parse(detailRaw);
                } catch (err) {
                    console.warn('Rybbit: Invalid JSON in data-rybbit-detail', err);
                    detail = { raw: detailRaw };
                }
            }

            // Merge text content if not present
            if (!detail.text && target.innerText) {
                detail.text = target.innerText.trim();
            }

            if (window.rybbit && typeof window.rybbit.event === 'function') {
                window.rybbit.event(name, detail);
            }
        }
    }, true);

})();
