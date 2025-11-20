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
     * Development Mode Improvements
     */
    if (config.dev_mode) {
        initDevMode();
    }

    /**
     * Recording Mode
     */
    if (config.recording_mode) {
        initRecordingMode();
    }

    function initRecordingMode() {
        console.log('Rybbit: Recording Mode Active');
        // Badge removed as per user request

        // Capture Custom Events
        var originalDispatchEvent = EventTarget.prototype.dispatchEvent;
        EventTarget.prototype.dispatchEvent = function (event) {
            if (event instanceof CustomEvent) {
                recordEvent('custom', event.type, event.detail);
            }
            return originalDispatchEvent.call(this, event);
        };

        // Capture Clicks
        document.addEventListener('click', function (e) {
            var target = e.target;
            // Use closest clickable element if target is not clickable
            var clickable = target.closest('a, button, input[type="submit"], input[type="button"]');
            if (clickable) target = clickable;

            var selector = getSelector(target);
            var humanName = getHumanName(target);
            if (selector) {
                recordEvent('click', humanName, { selector: selector, text: target.innerText });
            }
        }, true);

        // Capture Forms
        document.addEventListener('submit', function (e) {
            var form = e.target;
            var name = form.getAttribute('name') || form.getAttribute('id') || 'unknown_form';
            recordEvent('form_submit', 'Form: ' + name, { form_name: name, action: form.action });
        }, true);
    }

    /**
     * Live Recording Overlay
     */
    var overlay = null;
    var overlayList = null;
    var overlayStorageKey = 'rybbit_overlay_data';

    // Initialize Overlay if needed
    if (config.recording_mode) {
        initOverlay();
    } else {
        // Ensure clean state if not recording
        localStorage.removeItem(overlayStorageKey);
        var existingOverlay = document.getElementById('rybbit-live-overlay');
        if (existingOverlay) {
            existingOverlay.parentNode.removeChild(existingOverlay);
        }
    }

    function initOverlay() {
        // Check storage
        var data = getOverlayData();

        // If recording started but data says closed/finished, reset
        if (!data.isOpen || data.isFinished) {
            data = { isOpen: true, isFinished: false, events: [] };
            saveOverlayData(data);
        }

        createOverlayUI(data);
    }

    function createOverlayUI(data) {
        if (document.getElementById('rybbit-live-overlay')) return;

        overlay = document.createElement('div');
        overlay.id = 'rybbit-live-overlay';
        overlay.style.cssText = 'position:fixed; bottom:20px; right:20px; width:300px; height:400px; background:rgba(0,0,0,0.85); color:#fff; z-index:999999; border-radius:8px; display:flex; flex-direction:column; font-family:sans-serif; box-shadow:0 5px 20px rgba(0,0,0,0.3); backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.1); transition: opacity 0.3s;';

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'padding:10px 15px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:8px 8px 0 0; cursor:move;';
        header.innerHTML = '<span style="font-weight:bold; font-size:13px;">Rybbit Recording</span>';

        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'background:none; border:none; color:#fff; font-size:20px; cursor:pointer; line-height:1; opacity:0.7; padding:0;';
        closeBtn.onmouseover = function () { this.style.opacity = 1; };
        closeBtn.onmouseout = function () { this.style.opacity = 0.7; };
        closeBtn.onclick = closeOverlay;
        header.appendChild(closeBtn);
        overlay.appendChild(header);

        // List
        overlayList = document.createElement('ul');
        overlayList.style.cssText = 'flex:1; overflow-y:auto; margin:0; padding:10px; list-style:none; font-size:12px;';
        overlay.appendChild(overlayList);

        // Footer
        var footer = document.createElement('div');
        footer.style.cssText = 'padding:10px; border-top:1px solid rgba(255,255,255,0.1); text-align:center; display:flex; flex-direction:column; gap:8px;';

        if (data.isFinished) {
            // View History Button
            var historyBtn = document.createElement('a');
            historyBtn.href = config.admin_url + '&tab=rybbit_events';
            historyBtn.innerText = 'View Recording History';
            historyBtn.style.cssText = 'display:block; background:#2271b1; color:#fff; text-decoration:none; padding:8px; border-radius:4px; font-size:12px; font-weight:bold; text-align:center;';
            footer.appendChild(historyBtn);

            // Start New Recording Button
            var startBtn = document.createElement('button');
            startBtn.innerText = 'Start New Recording';
            startBtn.style.cssText = 'display:block; width:100%; background:#00a32a; color:#fff; border:none; padding:8px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;';
            startBtn.onclick = function (e) {
                if (window.rybbitToggleRecording) {
                    window.rybbitToggleRecording(e);
                } else {
                    alert('Please log in as admin to toggle recording.');
                }
            };
            footer.appendChild(startBtn);

        } else {
            // Status
            var status = document.createElement('div');
            status.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#00ff00; border-radius:50%; margin-right:5px;"></span> Recording Live...';
            status.style.cssText = 'color:#aaa; font-size:11px; margin-bottom:5px;';
            footer.appendChild(status);

            // Stop Recording Button
            var stopBtn = document.createElement('button');
            stopBtn.innerText = 'Stop Recording';
            stopBtn.style.cssText = 'display:block; width:100%; background:#d63638; color:#fff; border:none; padding:8px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;';
            stopBtn.onclick = function (e) {
                if (window.rybbitToggleRecording) {
                    window.rybbitToggleRecording(e);
                } else {
                    alert('Please log in as admin to toggle recording.');
                }
            };
            footer.appendChild(stopBtn);
        }
        overlay.appendChild(footer);

        document.body.appendChild(overlay);

        // Populate existing events
        if (data.events) {
            data.events.forEach(function (evt) {
                // Existing events in storage are just strings, assume they were saved
                addEventToOverlay(evt, false, true);
            });
            scrollToBottom();
        }

        // Make draggable
        makeDraggable(overlay, header);
    }

    function addEventToOverlay(text, save, isSaved) {
        if (!overlayList) return;

        var li = document.createElement('li');
        li.style.cssText = 'margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05); word-wrap:break-word;';

        // Dim if not saved (deduped)
        if (isSaved === false) {
            li.style.opacity = '0.5';
            text += ' <small>(duplicate)</small>';
        }

        li.innerHTML = '<span style="color:#4f94d4;">&rsaquo;</span> ' + escapeHtml(text);
        overlayList.appendChild(li);
        scrollToBottom();

        if (save !== false && isSaved !== false) {
            var data = getOverlayData();
            data.events.push(text);
            saveOverlayData(data);
        }
    }

    function closeOverlay() {
        if (overlay) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
            overlayList = null;
        }
        // Clear storage
        localStorage.removeItem(overlayStorageKey);
    }

    function getOverlayData() {
        var raw = localStorage.getItem(overlayStorageKey);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) { }
        }
        return { isOpen: false, isFinished: false, events: [] };
    }

    function saveOverlayData(data) {
        try {
            localStorage.setItem(overlayStorageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Rybbit: Failed to save overlay data to localStorage', e);
        }
    }

    function scrollToBottom() {
        if (overlayList) {
            overlayList.scrollTop = overlayList.scrollHeight;
        }
    }

    function makeDraggable(elmnt, handle) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            // Remove bottom/right if set, to allow free movement
            elmnt.style.bottom = 'auto';
            elmnt.style.right = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    var recordedCache = {};
    function recordEvent(type, name, detail) {
        detail = detail || {};
        var key = type + ':' + name;
        var isDeduped = !!recordedCache[key];

        if (config.dev_mode) {
            console.log('Rybbit Recording:', type, name, detail, isDeduped ? '(Deduped)' : '');
        }

        // Update Overlay - Show EVERYTHING
        if (overlay) {
            try {
                var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                // Pass !isDeduped as 'isSaved' flag
                addEventToOverlay('[' + time + '] ' + name, true, !isDeduped);
            } catch (e) {
                console.error('Rybbit: Overlay update failed', e);
            }
        }

        if (isDeduped) return; // Dedup per page load
        recordedCache[key] = true;

        // Prepare detail JSON safely
        var detailJson = '{}';
        try {
            // Handle circular references or other stringify errors
            var cache = [];
            detailJson = JSON.stringify(detail, function (key, value) {
                if (typeof value === 'object' && value !== null) {
                    if (cache.indexOf(value) !== -1) {
                        // Circular reference found, discard key
                        return;
                    }
                    // Store value in our collection
                    cache.push(value);
                }
                return value;
            });
            cache = null; // Enable garbage collection
        } catch (e) {
            console.error('Rybbit: Failed to stringify event detail', e);
            detailJson = '{"error": "JSON Stringify Failed"}';
        }

        // Send to backend
        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.ajax_url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send('action=rybbit_record_event&nonce=' + config.nonce + '&event[type]=' + encodeURIComponent(type) + '&event[name]=' + encodeURIComponent(name) + '&event[selector]=' + encodeURIComponent(detail.selector || '') + '&event[detail]=' + encodeURIComponent(detailJson));
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

    function getHumanName(el) {
        if (!el) return 'Unknown Element';

        // 1. Aria Label
        var label = el.getAttribute('aria-label');
        if (label) return label;

        // 2. Title
        var title = el.getAttribute('title');
        if (title) return title;

        // 3. Alt (for images)
        var alt = el.getAttribute('alt');
        if (alt) return alt;

        // 4. Inner Text (if short)
        var text = el.innerText || el.textContent;
        if (text) {
            text = text.trim();
            if (text.length > 0 && text.length < 30) return text;
            if (text.length >= 30) return text.substring(0, 30) + '...';
        }

        // 5. Placeholder (inputs)
        var placeholder = el.getAttribute('placeholder');
        if (placeholder) return placeholder;

        // 6. Name attribute
        var name = el.getAttribute('name');
        if (name) return name;

        // 7. ID
        if (el.id) return '#' + el.id;

        // 8. Fallback
        return el.tagName.toLowerCase();
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

    function initDevMode() {
        injectDevStyles();
        // Badge removed as per user request
        patchRybbitEvent();
    }

    function injectDevStyles() {
        var css = `
            .rybbit-toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            .rybbit-toast {
                background: #333;
                color: #fff;
                padding: 12px 16px;
                border-radius: 6px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                font-size: 13px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: rybbit-slide-in 0.3s ease-out;
                max-width: 300px;
                word-wrap: break-word;
                pointer-events: auto;
                cursor: pointer;
                border-left: 4px solid #2271b1;
            }
            .rybbit-toast-title {
                font-weight: bold;
                margin-bottom: 4px;
                display: block;
            }
            .rybbit-toast-meta {
                font-size: 11px;
                opacity: 0.8;
                font-family: monospace;
            }
            @keyframes rybbit-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes rybbit-fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function patchRybbitEvent() {
        // Wait for rybbit to be defined
        if (typeof window.rybbit === 'undefined') {
            setTimeout(patchRybbitEvent, 200);
            return;
        }

        if (window.rybbit.event && !window.rybbit.event.isPatched) {
            var originalEvent = window.rybbit.event;
            window.rybbit.event = function (name, params) {
                console.group('Rybbit Analytics Event');
                console.log('Event Name:', name);
                console.log('Parameters:', params);
                console.groupEnd();

                showToast(name, params);

                return originalEvent.apply(this, arguments);
            };
            window.rybbit.event.isPatched = true;
            console.log('Rybbit Dev Mode: Event interceptor active.');
        }
    }

    function showToast(title, data) {
        var container = document.querySelector('.rybbit-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'rybbit-toast-container';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'rybbit-toast';

        var content = '<span class="rybbit-toast-title">' + escapeHtml(title) + '</span>';
        if (data) {
            var dataStr = JSON.stringify(data).substring(0, 100);
            if (JSON.stringify(data).length > 100) dataStr += '...';
            content += '<span class="rybbit-toast-meta">' + escapeHtml(dataStr) + '</span>';
        }

        toast.innerHTML = content;

        // Click to dismiss
        toast.onclick = function () {
            removeToast(toast);
        };

        container.appendChild(toast);

        // Auto dismiss after 5s
        setTimeout(function () {
            removeToast(toast);
        }, 5000);
    }

    function removeToast(toast) {
        toast.style.animation = 'rybbit-fade-out 0.3s ease-out forwards';
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

})();
