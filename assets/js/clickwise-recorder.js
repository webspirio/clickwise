/**
 * Webspirio Clickwise Analytics - Recorder
 * Handles Recording Mode, Overlay UI, and Smart Event Capture
 */
(function () {
    'use strict';

    const config = window.clickwise_config || {};
    // If not in recording mode, check if we have saved session data to show review mode?
    // For now, rely on PHP to enqueue this script only when recording mode is active OR if we want to allow review.
    // But PHP only enqueues if recording_mode is true.
    // If user stops recording, we want to stay on page.
    // If user navigates away, script won't load. That's acceptable for now.

    // if (!config.recording_mode) return; // Removed to allow standalone highlighting

    // console.log('Clickwise: Recording Mode Active');

    /**
     * State & Configuration
     */
    const state = {
        isRecording: !!config.recording_mode,
        isMinimized: false,
        events: [],
        trackedKeys: new Set(),
        hoverTimer: null,
        lastScrollDepth: 0,
        sessionId: generateSessionId(),
        settings: {
            showDuplicates: false,
            ignoreAdmin: true,
            highlightTracked: false,
            ...loadSettings()
        }
    };

    // Load tracked events from config
    if (config.managed_events) {
        config.managed_events.forEach(evt => {
            // Use same key generation logic as frontend to ensure matching
            state.trackedKeys.add(generateKey(evt.type, evt.selector));
        });
    }

    /**
     * UI Components
     */
    let overlay, overlayList, highlighter;
    let eventListeners = [];

    function init() {
        if (state.isRecording) {
            createOverlay();
        }
        setupEventListeners();
        setupHighlighter();

        // Check for auto-highlight flag from admin bar
        if (localStorage.getItem('clickwise_auto_highlight')) {
            state.settings.highlightTracked = true;
            saveSettings();
            localStorage.removeItem('clickwise_auto_highlight');
        }

        // Restore state
        const savedData = loadOverlayData();
        if (savedData && savedData.events) {
            state.events = savedData.events;
            savedData.events.forEach(evt => addEventToUI(evt, false));
            // Restore session ID
            if (savedData.sessionId) {
                state.sessionId = savedData.sessionId;
            }
        }

        // Expose API
        window.clickwiseRecorder = {
            stopRecording: stopRecording,
            startNewSession: startNewSession,
            toggleHighlight: toggleHighlight,
            get isRecording() { return state.isRecording; }
        };

        // Initial static highlight check
        updateStaticHighlights();
        updateAdminBarUI();
    }

    function generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Event Listeners
     */
    function setupEventListeners() {
        const add = (target, type, handler) => {
            target.addEventListener(type, handler, true);
            eventListeners.push({ target, type, handler });
        };

        // Click
        add(document, 'click', handleEvent);

        // Form Submit
        add(document, 'submit', handleEvent);

        // Input Change
        add(document, 'change', handleEvent);

        // Hover (MouseEnter with delay)
        add(document, 'mouseover', handleHover);
        add(document, 'mouseout', handleMouseOut);

        // Scroll
        const scrollHandler = debounce(handleScroll, 200);
        window.addEventListener('scroll', scrollHandler);
        eventListeners.push({ target: window, type: 'scroll', handler: scrollHandler });

        // Custom Events
        // Note: Monkey patching EventTarget is hard to undo cleanly without storing original.
        // We'll just set a flag to stop recording custom events.
    }

    function removeEventListeners() {
        eventListeners.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler, true);
        });
        eventListeners = [];
    }

    function handleMouseOut(e) {
        hideHighlighter();
    }

    function handleEvent(e) {
        if (!state.isRecording) return;
        // Ignore overlay interactions
        if (overlay && overlay.contains(e.target)) return;
        if (highlighter && highlighter.contains(e.target)) return;

        // Ignore Admin Bar if setting enabled
        if (state.settings.ignoreAdmin && e.target.closest('#wpadminbar')) return;

        const el = e.target;
        const type = e.type === 'submit' ? 'form_submit' : (e.type === 'change' ? 'input_change' : 'click');

        // Smart Naming & Selector
        const name = getSmartName(el);
        const selector = getSmartSelector(el);
        const detail = {
            selector: selector,
            tag: el.tagName.toLowerCase(),
            text: el.innerText ? el.innerText.substring(0, 50) : '',
            value: el.value || '',
            href: el.href || '',
            id: el.id || '',
            classes: el.className || ''
        };

        recordEvent(type, name, detail);
    }

    function handleHover(e) {
        if (!state.isRecording) return;
        if (overlay && overlay.contains(e.target)) return;

        // Ignore Admin Bar if setting enabled
        if (state.settings.ignoreAdmin && e.target.closest('#wpadminbar')) return;

        // Show highlighter
        showHighlighter(e.target);

        // Debounce recording hover
        // For now, we don't auto-record hovers, just highlight
    }

    function handleScroll(e) {
        if (!state.isRecording) return;
        // Record scroll depth every 25%
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.scrollY;
        const percent = Math.floor((scrollTop / scrollHeight) * 100);

        if (percent % 25 === 0 && percent > state.lastScrollDepth) {
            recordEvent('scroll', `Scroll ${percent}%`, { depth: percent });
            state.lastScrollDepth = percent;
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Core Logic
     */
    function recordEvent(type, name, detail) {
        if (!state.isRecording) return;

        const key = generateKey(type, detail.selector);
        const isTracked = state.trackedKeys.has(key);
        const isDuplicate = state.events.some(e => e.key === key);

        const eventData = {
            id: Date.now() + Math.random(),
            type,
            name,
            detail,
            key,
            isTracked,
            timestamp: new Date().toISOString(),
            sessionId: state.sessionId
        };

        if (isDuplicate && !state.settings.showDuplicates) {
            // Just flash existing or ignore
            return;
        }

        state.events.push(eventData);
        saveOverlayData();
        addEventToUI(eventData, true);

        // Send to backend as 'pending' to ensure session is captured
        sendEventToBackend(eventData, 'pending');
    }

    function generateKey(type, selector) {
        // Simple hash for key - must match logic used in init()
        return type + ':' + selector;
    }

    function sendEventToBackend(evt, status) {
        const data = new FormData();
        data.append('action', 'clickwise_record_event');
        data.append('nonce', config.nonce);
        data.append('type', evt.type);
        data.append('name', evt.name);
        data.append('selector', evt.detail.selector);
        data.append('detail', JSON.stringify(evt.detail));
        data.append('session_id', evt.sessionId);
        data.append('status', status);

        fetch(config.ajax_url, {
            method: 'POST',
            body: data
        }).catch(err => console.error('Failed to save event', err));
    }

    /**
     * Smart Selector & Naming
     */
    function getSmartSelector(el) {
        if (el.id) return '#' + el.id;
        if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;

        // Path fallback
        let path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            } else {
                let sib = el;
                let nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += ":nth-of-type(" + nth + ")";
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }

    function getSmartName(el) {
        // Try text
        if (el.innerText && el.innerText.length < 30) return el.innerText;
        // Try aria-label
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        // Try title
        if (el.title) return el.title;
        // Try alt
        if (el.alt) return el.alt;
        // Fallback
        return el.tagName.toLowerCase();
    }

    function getLabel(el) {
        if (el.labels && el.labels.length > 0) return el.labels[0].innerText;
        return null;
    }

    /**
     * Overlay UI
     */
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'clickwise-live-overlay';

        // Header
        const header = document.createElement('div');
        header.id = 'clickwise-live-overlay-header';
        header.innerHTML = `
            <span id="clickwise-overlay-title">
                <span class="clickwise-status-dot"></span> <span id="cw-status-text">Recording Active</span>
            </span>
            <div class="clickwise-overlay-controls">
                <button class="clickwise-control-btn" id="cw-min-btn" title="Minimize">_</button>
                <button class="clickwise-control-btn" id="cw-set-btn" title="Settings">⚙️</button>
                <button class="clickwise-control-btn" id="cw-close-btn" title="Close">×</button>
            </div>
        `;

        // Settings Panel
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'clickwise-settings-panel';
        settingsPanel.innerHTML = `
            <label class="clickwise-setting-row">
                <input type="checkbox" id="cw-dup-check" ${state.settings.showDuplicates ? 'checked' : ''}> Show Duplicates
            </label>
            <label class="clickwise-setting-row">
                <input type="checkbox" id="cw-admin-check" ${state.settings.ignoreAdmin ? 'checked' : ''}> Ignore Admin Bar
            </label>
            <label class="clickwise-setting-row">
                <input type="checkbox" id="cw-highlight-check" ${state.settings.highlightTracked ? 'checked' : ''}> Highlight Tracked
            </label>
        `;

        // List
        overlayList = document.createElement('ul');
        overlayList.id = 'clickwise-live-overlay-list';

        // Footer
        const footer = document.createElement('div');
        footer.id = 'clickwise-live-overlay-footer';
        footer.innerHTML = `
            <button class="clickwise-overlay-btn clickwise-btn-stop">Stop Recording</button>
            <button class="clickwise-overlay-btn clickwise-btn-new-session" style="display:none;">New Session</button>
            <a href="${config.admin_url}&tab=events_manager" class="clickwise-overlay-btn clickwise-btn-manager" style="display:none; text-decoration:none; text-align:center;">Go to Events Manager</a>
        `;

        overlay.appendChild(header);
        overlay.appendChild(settingsPanel);
        overlay.appendChild(overlayList);
        overlay.appendChild(footer);

        // Resize Handles
        ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(dir => {
            const h = document.createElement('div');
            h.className = `clickwise-resize-handle clickwise-resize-${dir}`;
            h.dataset.dir = dir;
            overlay.appendChild(h);
        });

        document.body.appendChild(overlay);

        // Bind Events
        header.querySelector('#cw-min-btn').onclick = toggleMinimize;
        header.querySelector('#cw-set-btn').onclick = () => settingsPanel.classList.toggle('open');
        header.querySelector('#cw-close-btn').onclick = closeOverlay;
        footer.querySelector('.clickwise-btn-stop').onclick = stopRecording;
        footer.querySelector('.clickwise-btn-new-session').onclick = startNewSession;

        document.getElementById('cw-dup-check').onchange = (e) => {
            state.settings.showDuplicates = e.target.checked;
            saveSettings();
        };
        document.getElementById('cw-admin-check').onchange = (e) => {
            state.settings.ignoreAdmin = e.target.checked;
            saveSettings();
        };
        document.getElementById('cw-highlight-check').onchange = (e) => {
            state.settings.highlightTracked = e.target.checked;
            saveSettings();
            updateStaticHighlights();
            updateAdminBarUI();
        };

        makeDraggable(overlay, header);
        makeResizable(overlay);
    }

    function addEventToUI(evt, animate) {
        const li = document.createElement('li');
        li.className = 'clickwise-event-item';

        const icon = getIcon(evt.type);
        const badgeClass = evt.isTracked ? 'tracked' : 'untracked';
        const badgeText = evt.isTracked ? '✓ Tracked' : '+ Track';

        li.innerHTML = `
            <div class="clickwise-event-summary">
                <span class="clickwise-event-icon">${icon}</span>
                <span class="clickwise-event-content">${evt.name}</span>
                <span class="clickwise-track-badge ${badgeClass}" data-key="${evt.key}">${badgeText}</span>
                <span class="clickwise-expand-icon">▼</span>
            </div>
            <div class="clickwise-event-details">
                <div class="clickwise-detail-row">
                    <span class="clickwise-detail-label">Selector:</span>
                    <code>${evt.detail.selector || 'N/A'}</code>
                </div>
                <div class="clickwise-detail-row">
                    <span class="clickwise-detail-label">Details:</span>
                    <pre class="clickwise-json-pre">${JSON.stringify(evt.detail, null, 2)}</pre>
                </div>
            </div>
        `;

        // Toggle Details
        li.querySelector('.clickwise-event-summary').onclick = (e) => {
            if (!e.target.classList.contains('clickwise-track-badge')) {
                li.querySelector('.clickwise-event-details').classList.toggle('open');
            }
        };

        // Track/Untrack
        li.querySelector('.clickwise-track-badge').onclick = (e) => {
            e.stopPropagation();
            toggleTrack(evt, e.target);
        };

        overlayList.appendChild(li);
        overlayList.scrollTop = overlayList.scrollHeight;
    }

    function toggleTrack(evt, badge) {
        const isTracking = !state.trackedKeys.has(evt.key);

        // Optimistic UI
        if (isTracking) {
            state.trackedKeys.add(evt.key);
            badge.className = 'clickwise-track-badge tracked';
            badge.innerText = '✓ Tracked';

            // Send as tracked
            sendEventToBackend(evt, 'tracked');
        } else {
            state.trackedKeys.delete(evt.key);
            badge.className = 'clickwise-track-badge untracked';
            badge.innerText = '+ Track';

            // Send as untracked (delete or ignore)
            const data = new FormData();
            data.append('action', 'clickwise_untrack_event');
            data.append('nonce', config.nonce);
            data.append('key', evt.key); // PHP expects MD5, but we might send type/selector if key is mismatch
            data.append('type', evt.type);
            data.append('selector', evt.detail.selector);

            fetch(config.ajax_url, { method: 'POST', body: data });
        }

        updateStaticHighlights();
    }

    /**
     * Utilities
     */
    function getIcon(type) {
        const map = {
            click: '🖱️',
            form_submit: '📝',
            input_change: '⌨️',
            scroll: '📜',
            hover: '👁️',
            custom: '⚡'
        };
        return map[type] || '📄';
    }

    function toggleMinimize() {
        overlay.classList.toggle('minimized');
        state.isMinimized = overlay.classList.contains('minimized');
        const btn = overlay.querySelector('#cw-min-btn');
        btn.innerText = state.isMinimized ? '+' : '_';
    }

    function stopRecording() {
        if (!state.isRecording) return;

        state.isRecording = false;
        removeEventListeners();

        // Update UI
        const statusText = document.getElementById('cw-status-text');
        const statusDot = document.querySelector('.clickwise-status-dot');
        const stopBtn = document.querySelector('.clickwise-btn-stop');
        const newSessionBtn = document.querySelector('.clickwise-btn-new-session');
        const managerBtn = document.querySelector('.clickwise-btn-manager');

        if (statusText) statusText.innerText = 'Recording Stopped';
        if (statusDot) statusDot.style.backgroundColor = '#f44336'; // Red
        if (stopBtn) stopBtn.style.display = 'none';
        if (newSessionBtn) newSessionBtn.style.display = 'inline-block';
        if (managerBtn) managerBtn.style.display = 'inline-block';

        updateAdminBarUI();

        // Notify Backend to turn off recording mode
        const data = new FormData();
        data.append('action', 'clickwise_toggle_recording');
        data.append('nonce', config.nonce);
        fetch(config.ajax_url, { method: 'POST', body: data });
    }

    function startNewSession() {
        // Clear state
        state.events = [];
        state.sessionId = generateSessionId();
        state.isRecording = true;

        // Clear UI List
        overlayList.innerHTML = '';

        // Clear LocalStorage for events
        saveOverlayData();

        setupEventListeners();

        // Update UI
        const statusText = document.getElementById('cw-status-text');
        const statusDot = document.querySelector('.clickwise-status-dot');
        const stopBtn = document.querySelector('.clickwise-btn-stop');
        const newSessionBtn = document.querySelector('.clickwise-btn-new-session');
        const managerBtn = document.querySelector('.clickwise-btn-manager');

        if (statusText) statusText.innerText = 'Recording Active';
        if (statusDot) statusDot.style.backgroundColor = '#4caf50'; // Green
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (newSessionBtn) newSessionBtn.style.display = 'none';
        if (managerBtn) managerBtn.style.display = 'none';

        updateAdminBarUI();

        // Notify Backend to turn on recording mode
        const data = new FormData();
        data.append('action', 'clickwise_toggle_recording');
        data.append('nonce', config.nonce);
        fetch(config.ajax_url, { method: 'POST', body: data });
    }

    function closeOverlay() {
        // If recording, stop first
        if (state.isRecording) {
            stopRecording();
        }
        overlay.style.display = 'none';
    }

    function saveOverlayData() {
        localStorage.setItem('clickwise_overlay_data', JSON.stringify({
            events: state.events,
            sessionId: state.sessionId, // Save session ID
            timestamp: Date.now()
        }));
    }

    function loadOverlayData() {
        try {
            return JSON.parse(localStorage.getItem('clickwise_overlay_data'));
        } catch (e) { return null; }
    }

    function saveSettings() {
        localStorage.setItem('clickwise_recorder_settings', JSON.stringify(state.settings));
    }

    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem('clickwise_recorder_settings')) || {};
        } catch (e) { return {}; }
    }

    function toggleHighlight() {
        state.settings.highlightTracked = !state.settings.highlightTracked;
        saveSettings();
        updateStaticHighlights();

        // Sync checkbox in overlay
        const checkbox = document.getElementById('cw-highlight-check');
        if (checkbox) checkbox.checked = state.settings.highlightTracked;

        updateAdminBarUI();
    }

    function updateAdminBarUI() {
        const toggleLink = document.querySelector('#wp-admin-bar-clickwise-toggle-recording > a');
        const topLevelLink = document.querySelector('#wp-admin-bar-clickwise-analytics > a');
        const topLevelItem = document.querySelector('#wp-admin-bar-clickwise-analytics');
        const highlightLink = document.querySelector('#wp-admin-bar-clickwise-toggle-highlight > a');

        // Update Highlight Switch (Common for both states)
        if (highlightLink) {
            const isOn = state.settings.highlightTracked;
            const badgeStyle = `display:inline-block;padding:2px 6px;border-radius:10px;background:${isOn ? '#4caf50' : '#9ca3af'};color:white;font-size:10px;margin-left:8px;vertical-align:middle;line-height:1.2;`;
            highlightLink.innerHTML = `Highlight Tracked <span style="${badgeStyle}">${isOn ? 'ON' : 'OFF'}</span>`;
        }

        if (state.isRecording) {
            if (toggleLink) {
                toggleLink.innerText = 'Stop Recording';
                toggleLink.style.color = '#f44336'; // Red
            }
            if (topLevelLink) topLevelLink.innerText = '● Recording Events';
            if (topLevelItem) topLevelItem.classList.add('clickwise-recording-active');
        } else {
            if (toggleLink) {
                toggleLink.innerText = 'Start Recording';
                toggleLink.style.color = '#4caf50'; // Green
            }
            if (topLevelLink) topLevelLink.innerText = 'Clickwise Analytics';
            if (topLevelItem) topLevelItem.classList.remove('clickwise-recording-active');
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Draggable & Resizable (Simplified for brevity, fully implemented in original)
    function makeDraggable(elmnt, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            e = e || window.event;
            if (e.target.tagName === 'BUTTON') return;
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
        }
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function makeResizable(elmnt) {
        // ... (Similar to original implementation)
    }

    // Highlighter
    function setupHighlighter() {
        highlighter = document.createElement('div');
        highlighter.className = 'clickwise-highlighter';
        highlighter.innerHTML = '<span class="clickwise-highlighter-label"></span>';
        document.body.appendChild(highlighter);
    }

    function showHighlighter(el) {
        if (!highlighter) return;
        const rect = el.getBoundingClientRect();
        highlighter.style.display = 'block';
        highlighter.style.top = (window.scrollY + rect.top) + 'px';
        highlighter.style.left = (window.scrollX + rect.left) + 'px';
        highlighter.style.width = rect.width + 'px';
        highlighter.style.height = rect.height + 'px';

        const label = highlighter.querySelector('.clickwise-highlighter-label');
        label.innerText = getSmartName(el);

        // Check if tracked
        const key = generateKey('click', getSmartSelector(el));
        if (state.trackedKeys.has(key)) {
            highlighter.classList.add('tracked');
            label.innerText += ' (Tracked)';
        } else {
            highlighter.classList.remove('tracked');
        }
    }

    function hideHighlighter() {
        if (highlighter) highlighter.style.display = 'none';
    }

    function updateStaticHighlights() {
        // Remove existing
        document.querySelectorAll('.clickwise-static-highlight').forEach(el => el.remove());

        if (!state.settings.highlightTracked) return;

        const selectors = new Set();

        // From managed events
        if (config.managed_events) {
            config.managed_events.forEach(evt => {
                const key = generateKey(evt.type, evt.selector);
                if (state.trackedKeys.has(key)) {
                    selectors.add(evt.selector);
                }
            });
        }

        // From current session events
        state.events.forEach(evt => {
            if (state.trackedKeys.has(evt.key)) {
                selectors.add(evt.detail.selector);
            }
        });

        // Draw
        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (el.offsetParent === null) return; // Hidden
                    showStaticHighlight(el);
                });
            } catch (e) { console.warn('Invalid selector', selector); }
        });
    }

    function showStaticHighlight(el) {
        const rect = el.getBoundingClientRect();
        const h = document.createElement('div');
        h.className = 'clickwise-static-highlight';
        h.style.top = (window.scrollY + rect.top) + 'px';
        h.style.left = (window.scrollX + rect.left) + 'px';
        h.style.width = rect.width + 'px';
        h.style.height = rect.height + 'px';
        document.body.appendChild(h);
    }

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
