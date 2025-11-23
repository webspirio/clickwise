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

        // Check exclusion
        if (!shouldTrack(target)) return;

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
        if (!shouldTrack(form)) return;

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
        if (!shouldTrack(target)) return;

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
        if (!shouldTrack(target)) return;

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

    // Admin Bar Listener for Start/Stop
    document.addEventListener('DOMContentLoaded', function () {
        var toggleLink = document.querySelector('#wp-admin-bar-clickwise-toggle a');
        if (toggleLink) {
            toggleLink.addEventListener('click', function (e) {
                // If we are currently recording, this click will STOP it (reload page with mode=0)
                // If we are currently stopped, this click will START it (reload page with mode=1)

                if (config.recording_mode) {
                    // We are about to STOP
                    var data = getOverlayData();
                    data.isFinished = true;
                    data.isOpen = true; // Keep open
                    saveOverlayData(data);
                } else {
                    // We are about to START
                    // Force new session on next load
                    var data = { isOpen: true, isFinished: false, events: [] };
                    saveOverlayData(data);
                    // Clear session ID to force generation
                    localStorage.removeItem('clickwise_recording_session');
                }
            });
        }
    });

    /**
     * Live Recording Overlay
     */
    var overlay = null;
    var overlayList = null;
    var overlayList = null;
    var overlayStorageKey = 'clickwise_overlay_data';
    var settingsStorageKey = 'clickwise_overlay_settings';
    var isResizing = false;

    // Load Settings
    var overlaySettings = {
        showDuplicates: false,
        ignoreAdmin: (typeof config.ignore_admin !== 'undefined') ? config.ignore_admin : true
    };
    try {
        var storedSettings = localStorage.getItem(settingsStorageKey);
        if (storedSettings) {
            var parsed = JSON.parse(storedSettings);
            // Merge defaults
            overlaySettings = Object.assign({}, overlaySettings, parsed);
        }
    } catch (e) { }

    function saveSettings() {
        localStorage.setItem(settingsStorageKey, JSON.stringify(overlaySettings));
    }

    // Check if we should show overlay even if recording_mode is false (Stopped state)
    var overlayData = getOverlayData();
    if (config.recording_mode || (overlayData && overlayData.isOpen)) {
        initOverlay();
    }

    function initOverlay() {
        // Clear cache if starting fresh
        if (config.recording_mode && !overlayData.isFinished) {
            // If we just started (no events yet or forced fresh), clear cache
            // But be careful not to clear if we just reloaded page while recording
        }

        var data = getOverlayData();

        // If recording mode is ON but data says finished (inconsistent), reset to active
        if (config.recording_mode && data.isFinished) {
            data.isFinished = false;
            saveOverlayData(data);
        }

        createOverlayUI(data);
    }

    function createOverlayUI(data) {
        if (document.getElementById('clickwise-live-overlay')) return;

        overlay = document.createElement('div');
        overlay.id = 'clickwise-live-overlay';

        // Setup event delegation for track badges
        overlay.addEventListener('click', function (e) {
            if (e.target.classList.contains('clickwise-track-badge')) {
                e.stopPropagation();
                handleBadgeClick(e.target);
            }
        });

        // Header
        var header = document.createElement('div');
        header.id = 'clickwise-live-overlay-header';

        // Header Title with Icon
        var titleSpan = document.createElement('span');
        titleSpan.id = 'clickwise-overlay-title';
        titleSpan.innerHTML = '<span class="clickwise-status-dot ' + (data.isFinished ? 'stopped' : '') + '"></span> ' + (data.isFinished ? 'Recording Stopped' : 'Recording Active');
        header.appendChild(titleSpan);

        var controlsDiv = document.createElement('div');
        controlsDiv.className = 'clickwise-overlay-controls';

        // Minimize Button
        var minBtn = document.createElement('button');
        minBtn.className = 'clickwise-overlay-minimize';
        minBtn.innerHTML = '&minus;';
        minBtn.title = 'Minimize';
        minBtn.onclick = toggleMinimize;
        controlsDiv.appendChild(minBtn);

        // Settings Button
        var settingsBtn = document.createElement('button');
        settingsBtn.className = 'clickwise-overlay-settings-btn';
        settingsBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';
        settingsBtn.title = 'Overlay Settings';
        settingsBtn.onclick = toggleSettings;
        controlsDiv.appendChild(settingsBtn);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'clickwise-overlay-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Close Overlay';
        closeBtn.onclick = closeOverlay;
        controlsDiv.appendChild(closeBtn);

        // Settings Panel
        var settingsPanel = document.createElement('div');
        settingsPanel.id = 'clickwise-settings-panel';
        settingsPanel.className = 'clickwise-settings-panel';

        var dupRow = document.createElement('label');
        dupRow.className = 'clickwise-setting-row';
        var dupCheck = document.createElement('input');
        dupCheck.type = 'checkbox';
        dupCheck.checked = overlaySettings.showDuplicates;
        dupCheck.onchange = function (e) {
            overlaySettings.showDuplicates = e.target.checked;
            saveSettings();
            // Refresh list visibility
            updateDuplicateVisibility();
        };
        dupRow.appendChild(dupCheck);
        dupRow.appendChild(document.createTextNode('Show duplicates'));
        settingsPanel.appendChild(dupRow);

        var adminRow = document.createElement('label');
        adminRow.className = 'clickwise-setting-row';
        var adminCheck = document.createElement('input');
        adminCheck.type = 'checkbox';
        adminCheck.checked = overlaySettings.ignoreAdmin;
        adminCheck.onchange = function (e) {
            overlaySettings.ignoreAdmin = e.target.checked;
            saveSettings();
        };
        adminRow.appendChild(adminCheck);
        adminRow.appendChild(document.createTextNode('Ignore Admin Interface'));
        settingsPanel.appendChild(adminRow);

        header.appendChild(settingsPanel);

        header.appendChild(controlsDiv);
        overlay.appendChild(header);

        // List
        overlayList = document.createElement('ul');
        overlayList.id = 'clickwise-live-overlay-list';
        overlay.appendChild(overlayList);

        // Footer
        var footer = document.createElement('div');
        footer.id = 'clickwise-live-overlay-footer';
        overlay.appendChild(footer);

        // Resize Handles (8 directions)
        var directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        directions.forEach(function (dir) {
            var handle = document.createElement('div');
            handle.className = 'clickwise-resize-handle clickwise-resize-' + dir;
            handle.setAttribute('data-direction', dir);
            overlay.appendChild(handle);
        });

        document.body.appendChild(overlay);

        // Render Footer Content based on state
        renderFooter(data.isFinished);

        // Populate existing events
        if (data.events) {
            data.events.forEach(function (evt) {
                // evt is now an object { text: string, type: string, tracked: boolean }
                // Backward compatibility for string events
                if (typeof evt === 'string') {
                    addEventToOverlay({ text: evt, type: 'click', tracked: false }, false, true);
                } else {
                    addEventToOverlay(evt, false, true);
                }
            });
            scrollToBottom();
        }

        // Make draggable
        makeDraggable(overlay, header);

        // Make resizable
        makeResizable(overlay);
    }

    function renderFooter(isFinished) {
        var footer = document.getElementById('clickwise-live-overlay-footer');
        if (!footer) return;
        footer.innerHTML = '';

        if (isFinished) {
            // View History Button
            var historyBtn = document.createElement('a');
            historyBtn.className = 'clickwise-overlay-btn clickwise-btn-history';
            historyBtn.href = config.admin_url + '&tab=events_manager';
            historyBtn.innerText = 'View Recording History';
            footer.appendChild(historyBtn);

            // Start New Recording Button
            var startBtn = document.createElement('button');
            startBtn.className = 'clickwise-overlay-btn clickwise-btn-start';
            startBtn.innerText = 'Start New Recording';
            startBtn.onclick = function (e) {
                restartRecording(e);
            };
            footer.appendChild(startBtn);

        } else {
            // Stop Recording Button
            var stopBtn = document.createElement('button');
            stopBtn.className = 'clickwise-overlay-btn clickwise-btn-stop';
            stopBtn.innerText = 'Stop Recording';
            stopBtn.onclick = function (e) {
                stopRecording(e);
            };
            footer.appendChild(stopBtn);
        }
    }

    function stopRecording(e) {
        if (e) e.preventDefault();

        // Call AJAX to toggle OFF
        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.ajax_url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            if (xhr.status === 200) {
                // Update UI state locally without reload
                config.recording_mode = false;

                // Update Overlay Data
                var data = getOverlayData();
                data.isFinished = true;
                saveOverlayData(data);

                // Update Header
                var title = document.getElementById('clickwise-overlay-title');
                if (title) title.innerHTML = '<span class="clickwise-status-dot stopped"></span> Recording Stopped';

                // Update Footer
                renderFooter(true);
            }
        };
        xhr.send('action=clickwise_toggle_recording&nonce=' + config.nonce);
    }

    function restartRecording(e) {
        if (e) e.preventDefault();

        // Call AJAX to toggle ON (if needed, or just ensure session is active)
        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.ajax_url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            if (xhr.status === 200) {
                // Update UI state locally
                config.recording_mode = true;
                startNewSession(); // Generate new session ID

                // Update Overlay Data
                var data = { isOpen: true, isFinished: false, events: [] };
                saveOverlayData(data);

                // Clear List
                if (overlayList) overlayList.innerHTML = '';

                // Update Header
                var title = document.getElementById('clickwise-overlay-title');
                if (title) title.innerHTML = '<span class="clickwise-status-dot"></span> Recording Active';

                // Update Footer
                renderFooter(false);
            }
        };
        xhr.send('action=clickwise_toggle_recording&nonce=' + config.nonce);
    }

    function toggleMinimize() {
        if (overlay) {
            overlay.classList.toggle('minimized');
            var isMin = overlay.classList.contains('minimized');
            var minBtn = overlay.querySelector('.clickwise-overlay-minimize');
            var title = document.getElementById('clickwise-overlay-title');

            if (isMin) {
                minBtn.innerHTML = '+';
                // Store current size before minimizing if needed, but CSS handles fixed size
                // Hide text content except dot
                if (title) {
                    var dot = title.querySelector('.clickwise-status-dot');
                    title.innerHTML = '';
                    if (dot) title.appendChild(dot);
                }
            } else {
                minBtn.innerHTML = '&minus;';
                // Restore text
                if (title) {
                    var data = getOverlayData();
                    title.innerHTML = '<span class="clickwise-status-dot ' + (data.isFinished ? 'stopped' : '') + '"></span> ' + (data.isFinished ? 'Recording Stopped' : 'Recording Active');
                }
            }
        }
    }

    function getEventIcon(type) {
        var iconMap = {
            'click': '<span class="clickwise-event-icon clickwise-icon-click">🖱️</span>',
            'form_submit': '<span class="clickwise-event-icon clickwise-icon-form">📝</span>',
            'input_change': '<span class="clickwise-event-icon clickwise-icon-input">⌨️</span>',
            'input_focus': '<span class="clickwise-event-icon clickwise-icon-input">👁️</span>',
            'custom': '<span class="clickwise-event-icon clickwise-icon-custom">⚡</span>'
        };
        return iconMap[type] || '<span class="clickwise-event-icon">📄</span>';
    }

    function addEventToOverlay(eventData, save, isSaved) {
        if (!overlayList) return;

        var text = eventData.text;
        var type = eventData.type || 'click';
        var isTracked = eventData.tracked || false;
        var detail = eventData.detail || {};
        var key = eventData.key || '';

        var li = document.createElement('li');
        li.className = 'clickwise-event-item';

        // Store metadata in data attributes
        if (key) {
            li.setAttribute('data-event-key', key);
            li.setAttribute('data-tracked', isTracked ? '1' : '0');
        } else {
            // Mark as pending key
            li.setAttribute('data-pending-key', '1');
        }

        // Dim if duplicate
        if (isSaved === false) {
            li.classList.add('duplicate');

            // If hiding duplicates, don't show but highlight original
            if (!overlaySettings.showDuplicates) {
                li.style.display = 'none';
                highlightOriginal(key);
            } else {
                li.style.opacity = '0.8';
            }
        }

        // Summary Row
        var summary = document.createElement('div');
        summary.className = 'clickwise-event-summary';

        // Duplicate Badge (if duplicate)
        if (isSaved === false) {
            var dupBadge = document.createElement('span');
            dupBadge.className = 'clickwise-duplicate-badge';
            dupBadge.innerText = 'Duplicate';
            dupBadge.title = 'Click to see original';
            dupBadge.onclick = function (e) {
                e.stopPropagation();
                highlightOriginal(key);
            };
            summary.appendChild(dupBadge);
        }

        // Interactive Badge (Always visible)
        var badge = document.createElement('span');
        badge.className = 'clickwise-track-badge';

        if (!key) {
            // No key yet, show loading state
            badge.classList.add('loading');
            badge.innerText = '...';
            badge.style.opacity = '0.5';
            badge.style.cursor = 'wait';
        } else if (isTracked) {
            badge.classList.add('tracked');
            badge.innerText = '✓ Tracked';
        } else {
            badge.classList.add('untracked');
            badge.innerText = '+ Track';
        }

        // Append badge to summary manually to attach event listener
        // We need to insert it before the expand icon if we add one, or just append
        // Let's build the HTML string for icon/content first, then append elements

        summary.innerHTML = ''; // Clear string based HTML

        // Icon
        var iconSpan = document.createElement('span');
        iconSpan.innerHTML = getEventIcon(type); // getEventIcon returns string with span
        // Actually getEventIcon returns a string. Let's just set innerHTML of summary for the first part
        summary.innerHTML = getEventIcon(type) + '<span class="clickwise-event-content">' + escapeHtml(text) + '</span>';

        // Append Badge
        summary.appendChild(badge);

        // Append Expand Icon
        var expandIcon = document.createElement('span');
        expandIcon.className = 'clickwise-expand-icon';
        expandIcon.innerText = '▼';
        summary.appendChild(expandIcon);

        // Details Row
        var details = document.createElement('div');
        details.className = 'clickwise-event-details';

        var detailsHtml = '';
        if (eventData.selector) {
            detailsHtml += '<div class="clickwise-detail-row"><span class="clickwise-detail-label">Selector:</span> ' + escapeHtml(eventData.selector) + '</div>';
        }

        // JSON Detail with syntax highlighting
        var jsonStr = '';
        try {
            jsonStr = JSON.stringify(detail, null, 2);
        } catch (e) { jsonStr = '{}'; }

        detailsHtml += '<div class="clickwise-detail-row"><span class="clickwise-detail-label">Data:</span><pre class="clickwise-json-pre">' + highlightJSON(jsonStr) + '</pre></div>';

        // Remove old button logic from details

        details.innerHTML = detailsHtml;

        // Toggle Details (only if not clicking badge)
        summary.onclick = function (e) {
            // Don't toggle if clicking the badge
            if (!e.target.classList.contains('clickwise-track-badge')) {
                details.classList.toggle('open');
            }
        };

        // Remove old track button click handler logic

        li.appendChild(details); // Append details first (hidden)
        li.appendChild(summary); // Append summary second (flex order handles visual if needed, but CSS uses column)
        // Actually CSS is flex-direction: column. So append summary then details.
        li.innerHTML = ''; // Clear
        li.appendChild(summary);
        li.appendChild(details);

        overlayList.appendChild(li);
        scrollToBottom();

        if (save !== false && isSaved !== false) {
            var data = getOverlayData();
            // Store object instead of string
            data.events.push(eventData);
            saveOverlayData(data);
        }

        return li;
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
            // Don't drag if clicking buttons
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

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

    function makeResizable(elmnt) {
        var handles = elmnt.querySelectorAll('.clickwise-resize-handle');
        var startX, startY, startWidth, startHeight, startTop, startLeft;
        var currentDir = '';

        handles.forEach(function (handle) {
            handle.addEventListener('mousedown', function (e) {
                initResize(e, handle.getAttribute('data-direction'));
            });
        });

        function initResize(e, direction) {
            e.preventDefault();
            e.stopPropagation(); // Prevent drag conflict
            isResizing = true;
            currentDir = direction;

            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(elmnt).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(elmnt).height, 10);
            startTop = parseInt(document.defaultView.getComputedStyle(elmnt).top, 10);
            startLeft = parseInt(document.defaultView.getComputedStyle(elmnt).left, 10);

            window.addEventListener('mousemove', resize, false);
            window.addEventListener('mouseup', stopResize, false);
        }

        function resize(e) {
            if (elmnt.classList.contains('minimized')) return;

            var dx = e.clientX - startX;
            var dy = e.clientY - startY;

            // Min dimensions
            var minW = 280;
            var minH = 200;

            // Handle Width & Left
            if (currentDir.indexOf('e') !== -1) {
                var newW = startWidth + dx;
                if (newW >= minW) elmnt.style.width = newW + 'px';
            } else if (currentDir.indexOf('w') !== -1) {
                var newW = startWidth - dx;
                if (newW >= minW) {
                    elmnt.style.width = newW + 'px';
                    elmnt.style.left = (startLeft + dx) + 'px';
                }
            }

            // Handle Height & Top
            if (currentDir.indexOf('s') !== -1) {
                var newH = startHeight + dy;
                if (newH >= minH) elmnt.style.height = newH + 'px';
            } else if (currentDir.indexOf('n') !== -1) {
                var newH = startHeight - dy;
                if (newH >= minH) {
                    elmnt.style.height = newH + 'px';
                    elmnt.style.top = (startTop + dy) + 'px';
                }
            }
        }

        function stopResize(e) {
            isResizing = false;
            window.removeEventListener('mousemove', resize, false);
            window.removeEventListener('mouseup', stopResize, false);
        }
    }

    // Session Management
    var currentSessionId = null;
    var recordedCache = {}; // Moved here for proper scope

    function getSessionId() {
        if (currentSessionId) return currentSessionId;

        // Check storage first
        var stored = localStorage.getItem('clickwise_recording_session');
        if (stored) {
            currentSessionId = stored;
            return stored;
        }

        // Always generate new session ID when recording mode starts
        currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('clickwise_recording_session', currentSessionId);
        return currentSessionId;
    }

    function startNewSession() {
        currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('clickwise_recording_session', currentSessionId);
        // Clear overlay events and recorded cache
        recordedCache = {}; // Clear deduplication cache for new session
        return currentSessionId;
    }

    function recordEvent(type, name, detail) {
        // Don't record if stopped
        if (!config.recording_mode) return;

        detail = detail || {};
        var key = type + ':' + name;
        var isDeduped = !!recordedCache[key];

        if (config.dev_mode) {
            console.log('Clickwise Recording:', type, name, detail, isDeduped ? '(Deduped)' : '');
        }

        // Update Overlay - Show EVERYTHING
        var liElement = null;
        if (overlay) {
            try {
                var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                var tempId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                // Pass !isDeduped as 'isSaved' flag
                // Initially tracked=false, we update it after AJAX
                liElement = addEventToOverlay({
                    tempId: tempId,
                    text: '[' + time + '] ' + name,
                    type: type,
                    tracked: false,
                    detail: detail,
                    selector: detail.selector
                }, true, !isDeduped);
            } catch (e) {
                console.error('Clickwise: Overlay update failed', e);
            }
        }

        // if (isDeduped) return; // Dedup per page load - REMOVED to allow tracking of duplicates
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
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    var eventKey = response.data && response.data.key ? response.data.key : '';
                    var isTracked = response.data && response.data.status === 'tracked';

                    console.log('Clickwise AJAX Response:', { eventKey, isTracked, tempId, response });

                    function updateBadgeState(element, isTracked) {
                        var badge = element.querySelector('.clickwise-track-badge');
                        if (badge) {
                            badge.classList.remove('loading');
                            badge.style.opacity = '1';
                            badge.style.cursor = 'pointer';

                            if (isTracked) {
                                badge.classList.remove('untracked');
                                badge.classList.add('tracked');
                                badge.innerText = '✓ Tracked';
                            } else {
                                badge.classList.remove('tracked');
                                badge.classList.add('untracked');
                                badge.innerText = '+ Track';
                            }
                            console.log('Clickwise: Updated badge', badge);
                        }
                    }



                    // If we have a specific liElement passed, use that one primarily to remove pending status
                    // But actually we should update all matching by tempId if we could, but tempId is unique per event instance.
                    // The key is shared.

                    // Wait, if we just got the key, we need to assign it to the specific liElement first
                    if (liElement) {
                        liElement.setAttribute('data-event-key', eventKey);
                        liElement.setAttribute('data-tracked', isTracked ? '1' : '0');
                        liElement.removeAttribute('data-pending-key');
                        updateBadgeState(liElement, isTracked);
                    }

                    // Now update ANY other elements that might have this key (e.g. duplicates that already had the key)
                    var others = document.querySelectorAll('li.clickwise-event-item[data-event-key="' + eventKey + '"]');
                    others.forEach(function (el) {
                        el.setAttribute('data-tracked', isTracked ? '1' : '0');
                        updateBadgeState(el, isTracked);
                    });     // Update storage
                    var data = getOverlayData();
                    if (data.events.length > 0) {
                        // Find event by tempId
                        var targetEvt = null;
                        for (var i = data.events.length - 1; i >= 0; i--) {
                            if (data.events[i].tempId === tempId) {
                                targetEvt = data.events[i];
                                break;
                            }
                        }

                        if (targetEvt) {
                            targetEvt.key = eventKey;
                            targetEvt.tracked = isTracked;
                            saveOverlayData(data);
                        }
                    }
                } catch (e) {
                    console.error('Clickwise: Failed to parse response', e);
                }
            }
        };
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

    function updateEventStatus(key, status, liElement) {
        if (!key) return;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.ajax_url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                if (response.success) {
                    var isTracked = (status === 'tracked');

                    // Update ALL instances of this event
                    var allInstances = document.querySelectorAll('li.clickwise-event-item[data-event-key="' + key + '"]');
                    allInstances.forEach(function (el) {
                        el.setAttribute('data-tracked', isTracked ? '1' : '0');

                        var badge = el.querySelector('.clickwise-track-badge');
                        if (badge) {
                            if (isTracked) {
                                badge.classList.remove('untracked');
                                badge.classList.add('tracked');
                                badge.innerText = '✓ Tracked';
                            } else {
                                badge.classList.remove('tracked');
                                badge.classList.add('untracked');
                                badge.innerText = '+ Track';
                            }
                        }
                    });

                    // Update Storage
                    var data = getOverlayData();
                    var evt = data.events.find(function (e) { return e.key === key; });
                    if (evt) {
                        evt.tracked = isTracked;
                        saveOverlayData(data);
                    }
                }
            }
        };
        xhr.send('action=clickwise_update_event_status&nonce=' + config.nonce + '&key=' + encodeURIComponent(key) + '&status=' + encodeURIComponent(status));
    }

    function handleBadgeClick(badge) {
        var li = badge.closest('li.clickwise-event-item');
        if (!li) {
            console.warn('Clickwise: No li element found');
            return;
        }

        var eventKey = li.getAttribute('data-event-key');
        if (!eventKey) {
            console.warn('Clickwise: No event key found on li', li);
            console.warn('Clickwise: li attributes:', li.attributes);
            return;
        }

        console.log('Clickwise: Badge clicked, key:', eventKey);

        var isTracked = badge.classList.contains('tracked');
        var newStatus = isTracked ? 'pending' : 'tracked';

        // Optimistic UI - Update ALL instances
        var allInstances = document.querySelectorAll('li.clickwise-event-item[data-event-key="' + eventKey + '"]');
        allInstances.forEach(function (el) {
            el.setAttribute('data-tracked', newStatus === 'tracked' ? '1' : '0');
            var b = el.querySelector('.clickwise-track-badge');
            if (b) {
                if (newStatus === 'tracked') {
                    b.classList.remove('untracked');
                    b.classList.add('tracked');
                    b.innerText = '✓ Tracked';
                } else {
                    b.classList.remove('tracked');
                    b.classList.add('untracked');
                    b.innerText = '+ Track';
                }
            }
        });

        // Update backend
        updateEventStatus(eventKey, newStatus, li);
    }

    function updateBadgeState(li, isTracked) {
        var badge = li.querySelector('.clickwise-track-badge');
        if (badge) {
            badge.classList.remove('loading');
            badge.style.opacity = '1';
            badge.style.cursor = 'pointer';

            if (isTracked) {
                badge.classList.remove('untracked');
                badge.classList.add('tracked');
                badge.innerText = '✓ Tracked';
            } else {
                badge.classList.remove('tracked');
                badge.classList.add('untracked');
                badge.innerText = '+ Track';
            }
        }
    }

    function toggleSettings() {
        var panel = document.getElementById('clickwise-settings-panel');
        if (panel) panel.classList.toggle('open');
    }

    function updateDuplicateVisibility() {
        var dups = document.querySelectorAll('li.clickwise-event-item.duplicate');
        dups.forEach(function (li) {
            li.style.display = overlaySettings.showDuplicates ? 'block' : 'none';
        });
    }

    function highlightOriginal(key) {
        if (!key) return;
        // Find the first visible element with this key that is NOT a duplicate (or just the first one)
        // Actually, we want the original, which is usually the first one in the DOM.
        var all = document.querySelectorAll('li.clickwise-event-item[data-event-key="' + key + '"]');
        var original = null;

        // Try to find one that isn't marked duplicate
        for (var i = 0; i < all.length; i++) {
            if (!all[i].classList.contains('duplicate')) {
                original = all[i];
                break;
            }
        }

        // Fallback to first one if all are duplicates (shouldn't happen)
        if (!original && all.length > 0) original = all[0];

        if (original) {
            original.scrollIntoView({ behavior: 'smooth', block: 'center' });
            original.classList.remove('flash');
            void original.offsetWidth; // Trigger reflow
            original.classList.add('flash');
        }
    }

    function highlightJSON(jsonStr) {
        if (!jsonStr) return '';

        // Escape HTML first
        jsonStr = escapeHtml(jsonStr);

        // Highlight different JSON elements
        jsonStr = jsonStr.replace(/(&quot;[^&]*&quot;)\s*:/g, '<span class="key">$1</span>:'); // Keys
        jsonStr = jsonStr.replace(/:\s*(&quot;[^&]*&quot;)/g, ': <span class="string">$1</span>'); // String values
        jsonStr = jsonStr.replace(/:\s*(\d+)/g, ': <span class="number">$1</span>'); // Numbers
        jsonStr = jsonStr.replace(/:\s*(true|false)/g, ': <span class="boolean">$1</span>'); // Booleans
        jsonStr = jsonStr.replace(/:\s*(null)/g, ': <span class="null">$1</span>'); // null

        return jsonStr;
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

    function saveSettings() {
        localStorage.setItem(settingsStorageKey, JSON.stringify(overlaySettings));
    }

    function shouldTrack(target) {
        if (!target) return false;

        // 1. ALWAYS ignore the overlay itself
        if (target.closest('#clickwise-live-overlay')) return false;

        // 2. Ignore Admin Bar if configured
        if (overlaySettings.ignoreAdmin && target.closest('#wpadminbar')) return false;

        // 3. Ignore WP Admin Dashboard if configured (optional, but good for "Admin Interface")
        // If body has class wp-admin, we are in backend.
        // But maybe user wants to track backend?
        // Let's stick to explicit admin UI elements for now.

        // 4. Ignore elements with explicit ignore class
        if (target.closest('.clickwise-ignore')) return false;

        return true;
    }

})();
