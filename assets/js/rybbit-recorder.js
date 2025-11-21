/**
 * Webspirio Rybbit Analytics - Recorder
 * Handles Recording Mode and Overlay UI
 */
(function () {
    'use strict';

    var config = window.rybbit_config || {};

    if (!config.recording_mode) return;

    console.log('Rybbit: Recording Mode Active');

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

    /**
     * Live Recording Overlay
     */
    var overlay = null;
    var overlayList = null;
    var overlayStorageKey = 'rybbit_overlay_data';

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
        if (document.getElementById('rybbit-live-overlay')) return;

        overlay = document.createElement('div');
        overlay.id = 'rybbit-live-overlay';

        // Header
        var header = document.createElement('div');
        header.id = 'rybbit-live-overlay-header';
        header.innerHTML = '<span style="font-weight:bold; font-size:13px;">Rybbit Recording</span>';

        var controlsDiv = document.createElement('div');

        // Minimize Button
        var minBtn = document.createElement('button');
        minBtn.className = 'rybbit-overlay-minimize';
        minBtn.innerHTML = '&minus;';
        minBtn.onclick = toggleMinimize;
        controlsDiv.appendChild(minBtn);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'rybbit-overlay-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = closeOverlay;
        controlsDiv.appendChild(closeBtn);

        header.appendChild(controlsDiv);
        overlay.appendChild(header);

        // List
        overlayList = document.createElement('ul');
        overlayList.id = 'rybbit-live-overlay-list';
        overlay.appendChild(overlayList);

        // Footer
        var footer = document.createElement('div');
        footer.id = 'rybbit-live-overlay-footer';

        if (data.isFinished) {
            // View History Button
            var historyBtn = document.createElement('a');
            historyBtn.className = 'rybbit-overlay-btn rybbit-btn-history';
            historyBtn.href = config.admin_url + '&tab=rybbit_events';
            historyBtn.innerText = 'View Recording History';
            footer.appendChild(historyBtn);

            // Start New Recording Button
            var startBtn = document.createElement('button');
            startBtn.className = 'rybbit-overlay-btn rybbit-btn-start';
            startBtn.innerText = 'Start New Recording';
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
            stopBtn.className = 'rybbit-overlay-btn rybbit-btn-stop';
            stopBtn.innerText = 'Stop Recording';
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
            var minBtn = overlay.querySelector('.rybbit-overlay-minimize');
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
