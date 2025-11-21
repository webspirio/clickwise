/**
 * Webspirio Clickwise Analytics - Recorder
 * Handles Recording Mode and Overlay UI
 */
(function () {
    'use strict';

    var config = window.clickwise_config || {};

    if (!config.recording_mode) return;

    console.log('Clickwise: Recording Mode Active');

    // Capture Custom Events
    var originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
        if (event instanceof CustomEvent) {
            recordEvent('custom', event.type, {
                detail: event.detail,
                timestamp: Date.now(),
                interaction_type: 'programmatic'
            });
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
        var elementDetails = getElementDetails(target);

        if (selector) {
            recordEvent('click', humanName, {
                selector: selector,
                text: target.innerText,
                element_type: elementDetails.type,
                element_tag: elementDetails.tag,
                element_attributes: elementDetails.attributes,
                timestamp: Date.now(),
                interaction_type: 'user_interaction'
            });
        }
    }, true);

    // Capture Forms
    document.addEventListener('submit', function (e) {
        var form = e.target;
        var name = form.getAttribute('name') || form.getAttribute('id') || 'unknown_form';
        var elementDetails = getElementDetails(form);

        recordEvent('form_submit', 'Form: ' + name, {
            form_name: name,
            action: form.action,
            element_type: elementDetails.type,
            element_tag: elementDetails.tag,
            element_attributes: elementDetails.attributes,
            timestamp: Date.now(),
            interaction_type: 'user_interaction'
        });
    }, true);

    // Capture Input Changes
    document.addEventListener('input', function (e) {
        var target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            var elementDetails = getElementDetails(target);
            var humanName = getHumanName(target);

            recordEvent('input_change', humanName, {
                selector: getSelector(target),
                element_type: elementDetails.type,
                element_tag: elementDetails.tag,
                element_attributes: elementDetails.attributes,
                value_length: target.value ? target.value.length : 0,
                has_value: !!target.value,
                timestamp: Date.now(),
                interaction_type: 'user_interaction'
            });
        }
    }, true);

    // Capture Focus Events (when user focuses on input fields)
    document.addEventListener('focus', function (e) {
        var target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            var elementDetails = getElementDetails(target);
            var humanName = getHumanName(target);

            recordEvent('input_focus', humanName, {
                selector: getSelector(target),
                element_type: elementDetails.type,
                element_tag: elementDetails.tag,
                element_attributes: elementDetails.attributes,
                timestamp: Date.now(),
                interaction_type: 'user_interaction'
            });
        }
    }, true);

    /**
     * Live Recording Overlay
     */
    var overlay = null;
    var overlayList = null;
    var overlayStorageKey = 'clickwise_overlay_data';

    initOverlay();

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
        if (document.getElementById('clickwise-live-overlay')) return;

        overlay = document.createElement('div');
        overlay.id = 'clickwise-live-overlay';

        // Header
        var header = document.createElement('div');
        header.id = 'clickwise-live-overlay-header';
        header.innerHTML = '<span style="font-weight:bold; font-size:13px;">Clickwise Recording</span>';

        var controlsDiv = document.createElement('div');

        // Minimize Button
        var minBtn = document.createElement('button');
        minBtn.className = 'clickwise-overlay-minimize';
        minBtn.innerHTML = '&minus;';
        minBtn.onclick = toggleMinimize;
        controlsDiv.appendChild(minBtn);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'clickwise-overlay-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = closeOverlay;
        controlsDiv.appendChild(closeBtn);

        header.appendChild(controlsDiv);
        overlay.appendChild(header);

        // List
        overlayList = document.createElement('ul');
        overlayList.id = 'clickwise-live-overlay-list';
        overlay.appendChild(overlayList);

        // Footer
        var footer = document.createElement('div');
        footer.id = 'clickwise-live-overlay-footer';

        if (data.isFinished) {
            // View History Button
            var historyBtn = document.createElement('a');
            historyBtn.className = 'clickwise-overlay-btn clickwise-btn-history';
            historyBtn.href = config.admin_url + '&tab=clickwise_events';
            historyBtn.innerText = 'View Recording History';
            footer.appendChild(historyBtn);

            // Start New Recording Button
            var startBtn = document.createElement('button');
            startBtn.className = 'clickwise-overlay-btn clickwise-btn-start';
            startBtn.innerText = 'Start New Recording';
            startBtn.onclick = function (e) {
                startNewSession();
                if (window.clickwiseToggleRecording) {
                    window.clickwiseToggleRecording(e);
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
            stopBtn.className = 'clickwise-overlay-btn clickwise-btn-stop';
            stopBtn.innerText = 'Stop Recording';
            stopBtn.onclick = function (e) {
                if (window.clickwiseToggleRecording) {
                    window.clickwiseToggleRecording(e);
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
                addEventToOverlay(evt, false, true);
            });
            scrollToBottom();
        }

        // Make draggable
        makeDraggable(overlay, header);
    }

    function toggleMinimize() {
        if (overlay) {
            overlay.classList.toggle('minimized');
            var isMin = overlay.classList.contains('minimized');
            var minBtn = overlay.querySelector('.clickwise-overlay-minimize');
            if (minBtn) minBtn.innerHTML = isMin ? '+' : '&minus;';
        }
    }

    function addEventToOverlay(text, save, isSaved) {
        if (!overlayList) return;

        var li = document.createElement('li');

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
            console.error('Clickwise: Failed to save overlay data to localStorage', e);
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

    // Session Management
    var currentSessionId = null;
    function getSessionId() {
        if (currentSessionId) return currentSessionId;

        var stored = localStorage.getItem('clickwise_recording_session');
        if (stored) {
            currentSessionId = stored;
        } else {
            currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('clickwise_recording_session', currentSessionId);
        }
        return currentSessionId;
    }

    // Clear session on start/stop if needed, but for now let's keep it persistent per "recording session"
    // We can clear it when the user clicks "Start New Recording" in the overlay

    function startNewSession() {
        currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('clickwise_recording_session', currentSessionId);
        // Clear overlay events
        saveOverlayData({ isOpen: true, isFinished: false, events: [] });
        if (overlayList) overlayList.innerHTML = '';
        return currentSessionId;
    }

    var recordedCache = {};
    function recordEvent(type, name, detail) {
        detail = detail || {};
        var key = type + ':' + name;
        var isDeduped = !!recordedCache[key];

        if (config.dev_mode) {
            console.log('Clickwise Recording:', type, name, detail, isDeduped ? '(Deduped)' : '');
        }

        // Update Overlay - Show EVERYTHING
        if (overlay) {
            try {
                var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                // Pass !isDeduped as 'isSaved' flag
                addEventToOverlay('[' + time + '] ' + name, true, !isDeduped);
            } catch (e) {
                console.error('Clickwise: Overlay update failed', e);
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
            console.error('Clickwise: Failed to stringify event detail', e);
            detailJson = '{"error": "JSON Stringify Failed"}';
        }

        // Send to backend
        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.ajax_url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send('action=clickwise_record_event&nonce=' + config.nonce +
            '&session_id=' + encodeURIComponent(getSessionId()) +
            '&event[type]=' + encodeURIComponent(type) +
            '&event[name]=' + encodeURIComponent(name) +
            '&event[selector]=' + encodeURIComponent(detail.selector || '') +
            '&event[detail]=' + encodeURIComponent(detailJson));
    }

    function getSelector(el) {
        if (!el || el.nodeType !== 1) return '';

        // 1. Check for specific ID
        if (el.id) return '#' + el.id;

        // 2. Check for specific attributes that make it unique-ish
        if (el.hasAttribute('data-clickwise-id')) return '[' + 'data-clickwise-id="' + el.getAttribute('data-clickwise-id') + '"]';
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

    function getElementDetails(el) {
        if (!el) return { type: 'unknown', tag: 'unknown', attributes: {} };

        var tag = el.tagName.toLowerCase();
        var type = 'element';
        var attributes = {};

        // Determine element type
        switch (tag) {
            case 'button':
                type = 'button';
                break;
            case 'a':
                type = 'link';
                if (el.href) attributes.href = el.href;
                break;
            case 'img':
                type = 'image';
                if (el.src) attributes.src = el.src;
                if (el.alt) attributes.alt = el.alt;
                break;
            case 'input':
                type = 'input';
                var inputType = el.getAttribute('type') || 'text';
                attributes.input_type = inputType;
                if (inputType === 'submit' || inputType === 'button') {
                    type = 'button';
                }
                if (el.name) attributes.name = el.name;
                if (el.placeholder) attributes.placeholder = el.placeholder;
                break;
            case 'textarea':
                type = 'input';
                attributes.input_type = 'textarea';
                if (el.name) attributes.name = el.name;
                if (el.placeholder) attributes.placeholder = el.placeholder;
                break;
            case 'select':
                type = 'input';
                attributes.input_type = 'select';
                if (el.name) attributes.name = el.name;
                break;
            case 'form':
                type = 'form';
                if (el.action) attributes.action = el.action;
                if (el.method) attributes.method = el.method;
                break;
            case 'div':
            case 'span':
            case 'p':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                type = 'text';
                break;
            default:
                type = 'element';
        }

        // Collect common attributes
        if (el.id) attributes.id = el.id;
        if (el.className) attributes.class = el.className;
        if (el.getAttribute('role')) attributes.role = el.getAttribute('role');
        if (el.getAttribute('aria-label')) attributes['aria-label'] = el.getAttribute('aria-label');
        if (el.getAttribute('data-clickwise-name')) attributes['data-clickwise-name'] = el.getAttribute('data-clickwise-name');
        if (el.getAttribute('title')) attributes.title = el.getAttribute('title');

        return {
            type: type,
            tag: tag,
            attributes: attributes
        };
    }

    function getHumanName(el) {
        if (!el) return 'Unknown Element';

        // 0. Explicit Clickwise Name
        var cwName = el.getAttribute('data-clickwise-name');
        if (cwName) return cwName;

        // 1. Aria Label
        var label = el.getAttribute('aria-label');
        if (label) return label;

        // 2. Title
        var title = el.getAttribute('title');
        if (title) return title;

        // 3. Alt (for images)
        var alt = el.getAttribute('alt');
        if (alt) return alt;

        // 4. Inner Text (cleaned up)
        var text = el.innerText || el.textContent;
        if (text) {
            text = text.replace(/\s+/g, ' ').trim(); // Collapse whitespace
            if (text.length > 0) {
                if (text.length < 30) return text;
                return text.substring(0, 30) + '...';
            }
        }

        // 5. Placeholder (inputs)
        var placeholder = el.getAttribute('placeholder');
        if (placeholder) return placeholder;

        // 6. Name attribute
        var name = el.getAttribute('name');
        if (name) return name;

        // 7. ID
        if (el.id) return '#' + el.id;

        // 8. Fallback with element type info
        var elementDetails = getElementDetails(el);
        return elementDetails.type + ' (' + elementDetails.tag + ')';
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
