/**
 * Webspirio Clickwise Analytics Tracker
 * Author: Webspirio (Oleksandr Chornous)
 * Contact: contact@webspirio.com
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
jQuery(document).ready(function ($) {
    // --- Modal Logic ---
    var initialModalState = {};
    var modalMouseDownTarget = null;

    function getModalState() {
        return {
            alias: $('#modal-event-alias').val(),
            status: $('#modal-event-status').val()
        };
    }

    function hasUnsavedChanges() {
        var currentState = getModalState();
        return JSON.stringify(currentState) !== JSON.stringify(initialModalState);
    }

    function closeModal() {
        if (hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }
        $('#clickwise-event-modal').fadeOut();
    }

    $(document).on('click', '#clickwise-test-connection', function () {
        var button = $(this);
        var url = $('#clickwise_script_url').val();
        var resultSpan = $('#clickwise-test-result');

        if (!url) {
            resultSpan.css('color', 'red').text('Please enter a URL first.');
            return;
        }

        button.prop('disabled', true).text('Testing...');
        resultSpan.text('');

        $.post(clickwise_admin.ajax_url, {
            action: 'clickwise_test_connection',
            nonce: clickwise_admin.nonce,
            url: url
        }, function (response) {
            button.prop('disabled', false).text('Test Connection');
            if (response.success) {
                resultSpan.css('color', 'green').text(response.data);
            } else {
                resultSpan.css('color', 'red').text(response.data);
            }
        }).fail(function () {
            button.prop('disabled', false).text('Test Connection');
            resultSpan.css('color', 'red').text('Request failed. Please try again.');
        });
    });

    // --- Dynamic Script Loading ---
    var clickwiseScriptPromise = null;
    function loadClickwiseScript() {
        if (clickwiseScriptPromise) return clickwiseScriptPromise;

        clickwiseScriptPromise = new Promise(function (resolve, reject) {
            if (window.rybbit) {
                resolve();
                return;
            }

            if (!clickwise_admin.script_url || !clickwise_admin.site_id) {
                reject('Script URL or Site ID not configured.');
                return;
            }

            // Pre-set configuration to disable auto-tracking if the script supports it via global
            window.rybbit_config = window.rybbit_config || {};
            window.rybbit_config.track_pageview = false;
            window.rybbit_config.manual = true;
            // Keep clickwise_config for backward compatibility if needed
            window.clickwise_config = window.clickwise_config || {};
            window.clickwise_config.track_pageview = false;
            window.clickwise_config.manual = true;

            var script = document.createElement('script');
            script.src = clickwise_admin.script_url;
            script.setAttribute('data-site-id', clickwise_admin.site_id);

            // Prevent auto-tracking via attributes (best effort)
            script.setAttribute('data-auto-track-pageview', 'false');
            script.setAttribute('data-auto-pageview', 'false');
            script.setAttribute('data-manual', 'true');
            script.setAttribute('data-track-spa', 'false');

            // Network Interceptor to block Admin Pageviews
            // This ensures that even if the script tries to send a pageview, we catch it.
            (function () {
                // 1. Patch XMLHttpRequest
                var originalOpen = XMLHttpRequest.prototype.open;
                var originalSend = XMLHttpRequest.prototype.send;

                XMLHttpRequest.prototype.open = function (method, url) {
                    this._url = url;
                    return originalOpen.apply(this, arguments);
                };

                XMLHttpRequest.prototype.send = function (body) {
                    if (this._url && (this._url.indexOf('/api/event') !== -1 || this._url.indexOf('clickwise') !== -1 || this._url.indexOf('rybbit') !== -1)) {
                        // Check for pageview in body (JSON or form data string)
                        if (body && typeof body === 'string' && (body.indexOf('pageview') !== -1 || body.indexOf('"type":"pageview"') !== -1)) {
                            console.log('Clickwise Sandbox: Blocked auto-pageview (XHR).');
                            // Mock success
                            Object.defineProperty(this, 'readyState', { value: 4 });
                            Object.defineProperty(this, 'status', { value: 200 });
                            if (this.onload) this.onload();
                            return;
                        }
                    }
                    return originalSend.apply(this, arguments);
                };

                // 2. Patch fetch
                var originalFetch = window.fetch;
                window.fetch = function (input, init) {
                    var url = typeof input === 'string' ? input : input.url;
                    if (url && (url.indexOf('/api/event') !== -1 || url.indexOf('clickwise') !== -1 || url.indexOf('rybbit') !== -1)) {
                        var body = init ? init.body : null;
                        if (body && typeof body === 'string' && (body.indexOf('pageview') !== -1 || body.indexOf('"type":"pageview"') !== -1)) {
                            console.log('Clickwise Sandbox: Blocked auto-pageview (Fetch).');
                            return Promise.resolve(new Response(JSON.stringify({ status: 'blocked' }), { status: 200 }));
                        }
                    }
                    return originalFetch.apply(this, arguments);
                };

                // 3. Patch sendBeacon
                var originalSendBeacon = navigator.sendBeacon;
                navigator.sendBeacon = function (url, data) {
                    if (url && (url.indexOf('/api/event') !== -1 || url.indexOf('clickwise') !== -1 || url.indexOf('rybbit') !== -1)) {
                        // Data can be string, Blob, etc.
                        // If it's a string, check it.
                        if (typeof data === 'string' && (data.indexOf('pageview') !== -1 || data.indexOf('"type":"pageview"') !== -1)) {
                            console.log('Clickwise Sandbox: Blocked auto-pageview (Beacon).');
                            return true;
                        }
                        // If Blob, we can't easily read it synchronously, so we might let it pass or block all beacons?
                        // Let's assume Clickwise uses JSON string or similar.
                    }
                    return originalSendBeacon.apply(this, arguments);
                };
            })();

            script.defer = true;

            script.onload = function () {
                // Give it a moment to initialize
                setTimeout(function () {
                    if (window.rybbit) {
                        resolve();
                    } else {
                        reject('Script loaded but window.rybbit is undefined.');
                    }
                }, 100);
            };

            script.onerror = function () {
                reject('Failed to load script from ' + clickwise_admin.script_url);
            };

            document.head.appendChild(script);
        });

        return clickwiseScriptPromise;
    }

    function logSandbox(msg, type, data) {
        var logContent = $('.clickwise-sandbox-log-content');
        var time = new Date().toLocaleTimeString();

        // Remove initial message if it exists
        logContent.find('.clickwise-log-entry.initial').remove();

        // Create new log entry
        var entry = $('<div class="clickwise-log-entry"></div>');
        if (type) {
            entry.addClass(type);
        }

        // Add timestamp
        var timeSpan = $('<span class="log-time">[' + time + ']</span>');
        entry.append(timeSpan);

        // Add message with enhanced formatting
        var messageSpan = $('<span class="log-message"></span>');
        messageSpan.html(formatLogMessage(msg));
        entry.append(messageSpan);

        // Add JSON data if provided
        if (data && typeof data === 'object') {
            var jsonDiv = $('<div class="log-json"></div>');
            jsonDiv.html(formatJSON(data));
            entry.append(jsonDiv);
        }

        // Prepend new entry (newest first)
        logContent.prepend(entry);

        // Auto-scroll to top to show latest entry
        logContent.scrollTop(0);

        // Limit log entries to 50 to prevent memory issues
        var entries = logContent.find('.clickwise-log-entry');
        if (entries.length > 50) {
            entries.slice(50).remove();
        }
    }

    function formatLogMessage(msg) {
        // Enhanced message formatting with highlighting
        return msg
            .replace(/(success|ok|complete|sent)/gi, '<strong>$1</strong>')
            .replace(/(error|failed|failure|timeout)/gi, '<strong style="color: #fca5a5;">$1</strong>')
            .replace(/(warning|warn)/gi, '<strong style="color: #fcd34d;">$1</strong>')
            .replace(/(\d+(?:\.\d+)?)/g, '<span style="color: #fcd34d;">$1</span>') // Numbers
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--cw-cyan-400);">$1</a>') // URLs
            .replace(/`([^`]+)`/g, '<code style="background: var(--cw-cyan-900); padding: 2px 4px; border-radius: 3px;">$1</code>'); // Code
    }

    function formatJSON(data) {
        try {
            var formatted = JSON.stringify(data, null, 2);
            return formatted
                .replace(/("[\w]+"):/g, '<span class="json-key">$1</span>:')
                .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
                .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
                .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
                .replace(/: (null)/g, ': <span class="json-null">$1</span>');
        } catch (e) {
            return JSON.stringify(data);
        }
    }

    // Clear log functionality
    $(document).on('click', '#clickwise-clear-log', function () {
        var logContent = $('.clickwise-sandbox-log-content');
        logContent.empty();
        logContent.append('<div class="clickwise-log-entry initial"><span class="log-time">[Ready]</span><span class="log-message">Sandbox ready to send events...</span></div>');
    });

    // Send Test Event (General Settings)
    $(document).on('click', '#clickwise-send-test-event', function () {
        var button = $(this);
        var resultSpan = $('#clickwise-test-event-result');

        button.prop('disabled', true).text('Loading...');
        resultSpan.text('');

        loadClickwiseScript().then(function () {
            button.text('Sending...');
            try {
                window.rybbit.event('test_event', {
                    source: 'wordpress_admin_test',
                    timestamp: Date.now()
                });

                setTimeout(function () {
                    button.prop('disabled', false).text('Send Test Event');
                    resultSpan.css('color', 'green').text('Event initiated via browser script!');
                }, 500);
            } catch (e) {
                throw e;
            }
        }).catch(function (err) {
            button.prop('disabled', false).text('Send Test Event');
            resultSpan.css('color', 'red').text(err);
        });
    });

    // Sandbox Send Event (Enhanced with handler validation)
    // Show sandbox notification
    function showSandboxNotification(message, type = 'warning', duration = 4000) {
        // Find or create notification container in sandbox area
        let $container = $('.clickwise-sandbox-notification-container');

        if ($container.length === 0) {
            // Create container in sandbox area
            const $sandboxContent = $('#clickwise-sub-sandbox .clickwise-content');
            if ($sandboxContent.length > 0) {
                $container = $('<div class="clickwise-sandbox-notification-container"></div>');
                $sandboxContent.prepend($container);
            }
        }

        // Remove any existing notifications
        $container.find('.clickwise-sandbox-notification').remove();

        const iconMap = {
            'error': '❌',
            'warning': '⚠️',
            'success': '✅',
            'info': 'ℹ️'
        };

        const $notification = $(`
            <div class="clickwise-sandbox-notification clickwise-sandbox-notification-${type}">
                <span class="sandbox-notification-icon">${iconMap[type] || '⚠️'}</span>
                <span class="sandbox-notification-message">${message}</span>
                <button type="button" class="sandbox-notification-close">&times;</button>
            </div>
        `);

        $container.append($notification);

        // Animate in with slide down effect
        setTimeout(() => {
            $notification.addClass('sandbox-notification-show');
        }, 50);

        // Auto-hide after delay
        const hideTimeout = setTimeout(() => {
            hideSandboxNotification($notification);
        }, duration);

        // Manual close
        $notification.find('.sandbox-notification-close').on('click', function () {
            clearTimeout(hideTimeout);
            hideSandboxNotification($notification);
        });
    }

    // Hide sandbox notification
    function hideSandboxNotification($notification) {
        $notification.removeClass('sandbox-notification-show');
        setTimeout(() => {
            $notification.remove();
        }, 300);
    }

    $(document).on('click', '#clickwise-sandbox-send', function () {
        var button = $(this);

        // First check if handlers are selected
        if (window.selectedHandlers.size === 0) {
            showSandboxNotification('Please select at least one handler to test with.', 'warning');

            // Shake the send button
            button.addClass('clickwise-error-shake');
            setTimeout(function() {
                button.removeClass('clickwise-error-shake');
            }, 500);

            // Highlight the handler selection area
            var $handlerSelection = $('.clickwise-handler-selection');
            $handlerSelection.addClass('clickwise-error-highlight');
            setTimeout(function() {
                $handlerSelection.removeClass('clickwise-error-highlight');
            }, 2000);

            return;
        }

        var name = $('#clickwise-sandbox-name').val();
        var propsStr = $('#clickwise-sandbox-props').val();
        var props = {};

        if (!name) {
            showSandboxNotification('Please enter an event name.', 'warning');

            // Shake the send button and highlight event name input
            button.addClass('clickwise-error-shake');
            var $eventNameInput = $('#clickwise-sandbox-name');
            $eventNameInput.addClass('clickwise-error-shake');
            setTimeout(function() {
                button.removeClass('clickwise-error-shake');
                $eventNameInput.removeClass('clickwise-error-shake');
            }, 500);

            return;
        }

        // Log selected handlers info
        var selectedHandlersArray = Array.from(window.selectedHandlers);
        console.log('🚀 Sending event to selected handlers:', selectedHandlersArray);
        logSandbox('Testing with handlers: ' + selectedHandlersArray.join(', '), 'info', {
            selectedHandlers: selectedHandlersArray,
            totalHandlers: window.selectedHandlers.size
        });

        try {
            if (propsStr) {
                props = JSON.parse(propsStr);
            }
        } catch (e) {
            showSandboxNotification('Invalid JSON in properties.', 'error');

            // Shake the send button and properties textarea
            button.addClass('clickwise-error-shake');
            var $propsTextarea = $('#clickwise-sandbox-props');
            $propsTextarea.addClass('clickwise-error-shake');
            setTimeout(function() {
                button.removeClass('clickwise-error-shake');
                $propsTextarea.removeClass('clickwise-error-shake');
            }, 500);

            return;
        }

        // Use the feedback system if available
        var feedback = null;
        if (window.ClickwiseButtonFeedback) {
            feedback = new window.ClickwiseButtonFeedback(button[0]);
            feedback.loading('Loading...');
        } else {
            button.prop('disabled', true).text('Loading...');
        }

        loadClickwiseScript().then(function () {
            if (feedback) {
                feedback.loading('Sending...');
            } else {
                button.text('Sending...');
            }

            try {
                window.rybbit.event(name, props);

                setTimeout(() => {
                    if (feedback) {
                        feedback.success('Event sent!');
                    } else {
                        button.prop('disabled', false).text('Send Custom Event');
                    }

                    logSandbox('Event `' + name + '` sent successfully', 'success', props);
                }, 500);
            } catch (e) {
                if (feedback) {
                    feedback.error('Failed to send!');
                } else {
                    button.prop('disabled', false).text('Send Custom Event');
                }
                logSandbox('Error executing event: ' + e.message, 'error', { eventName: name, error: e.message });
            }
        }).catch(function (err) {
            if (feedback) {
                feedback.error('Script failed!');
            } else {
                button.prop('disabled', false).text('Send Custom Event');
            }
            logSandbox('Failed to load Clickwise script: ' + err, 'error', { error: err });
        });
    });

    // Update Event Status
    $(document).on('click', '.clickwise-update-status', function () {
        var button = $(this);
        var key = button.data('key');
        var status = button.data('status');
        var row = button.closest('tr');

        $.post(clickwise_admin.ajax_url, {
            action: 'clickwise_update_event_status',
            nonce: clickwise_admin.nonce,
            key: key,
            status: status
        }, function (response) {
            if (response.success) {
                location.reload(); // Reload to see updated status
            } else {
                alert('Error: ' + response.data);
            }
        });
    });

    // --- Modal Logic ---
    var initialModalState = {};
    var modalMouseDownTarget = null;

    function getModalState() {
        return {
            alias: $('#modal-event-alias').val(),
            status: $('#modal-event-status').val()
        };
    }

    function hasUnsavedChanges() {
        var currentState = getModalState();
        return JSON.stringify(currentState) !== JSON.stringify(initialModalState);
    }

    function closeModal() {
        if (hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }
        $('#clickwise-event-modal').fadeOut();
    }

    function parsePotentialJSON(input) {
        try {
            var parsed = input;
            if (typeof parsed === 'string') {
                // Try parsing standard JSON
                try {
                    parsed = JSON.parse(parsed);
                } catch (e) {
                    // If failed, it might be a slashed string from WP DB (e.g. {\"key\":\"val\"})
                    // Try unslashing quotes and parsing again
                    if (parsed.indexOf('\\"') !== -1) {
                        var unslashed = parsed.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        parsed = JSON.parse(unslashed);
                    } else {
                        throw e;
                    }
                }
            }
            // Recursively parse if the result is still a string that looks like JSON
            if (typeof parsed === 'string' && (parsed.trim().startsWith('{') || parsed.trim().startsWith('['))) {
                return parsePotentialJSON(parsed);
            }
            return parsed;
        } catch (e) {
            return input;
        }
    }

    function syntaxHighlight(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    // Track/Untrack Event Button
    $(document).on('click', '.clickwise-track-event', function () {
        var button = $(this);
        var key = button.data('key');
        var eventName = button.data('name');
        var action = button.data('action');
        var currentStatus = button.data('status');

        if (!eventName) {
            alert('Event name not found.');
            return;
        }

        // Show confirmation for untrack actions only
        if (action === 'untrack') {
            if (!confirm('Are you sure you want to untrack this event? It will be moved to the Ignored Events list.')) {
                return;
            }
        }

        // Use the feedback system if available
        var feedback = null;
        if (window.ClickwiseButtonFeedback) {
            feedback = new window.ClickwiseButtonFeedback(button[0]);
            feedback.loading('Loading...');
        } else {
            button.prop('disabled', true).text('Loading...');
        }

        // Handle track/untrack action via AJAX
        $.ajax({
            url: clickwise_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'clickwise_untrack_event',
                key: key,
                action_type: action,
                nonce: clickwise_admin.nonce
            },
            success: function (response) {
                if (response.success) {
                    var successText = action === 'untrack' ? 'Untracked!' : 'Tracked!';
                    if (feedback) {
                        feedback.success(successText);
                    } else {
                        button.prop('disabled', false).text(successText);
                    }

                    // Update UI without page refresh
                    setTimeout(() => {
                        updateEventStatus(key, response.data.new_status, action, button);
                    }, 1000);

                } else {
                    if (feedback) {
                        feedback.error('Failed!');
                    } else {
                        button.prop('disabled', false);
                    }
                }
            },
            error: function () {
                if (feedback) {
                    feedback.error('Request failed!');
                } else {
                    button.prop('disabled', false);
                }
            }
        });
    });

    // Function to update event status across all UI sections
    function updateEventStatus(eventKey, newStatus, action, originalButton) {
        // 1. Update the original button
        updateButton(originalButton, newStatus);

        // 2. Move the row between tabs if needed
        if (action === 'untrack') {
            moveEventRowToIgnored(eventKey);
        } else if (action === 'track') {
            moveEventRowToTracked(eventKey);
        }

        // 3. Update history section status indicators
        updateHistoryStatus(eventKey, newStatus);

        // 4. Update any other buttons for this event
        updateOtherButtons(eventKey, newStatus);
    }

    // Update a single button's state and text
    function updateButton(button, newStatus) {
        var isTracked = newStatus === 'tracked';
        var newText = isTracked ? 'Untrack' : 'Track';
        var newAction = isTracked ? 'untrack' : 'track';

        button.data('status', newStatus);
        button.data('action', newAction);
        button.text(newText);

        if (isTracked) {
            button.attr('data-action', 'untrack');
        } else {
            button.removeAttr('data-action');
        }

        // Reset button state
        button.prop('disabled', false);
    }

    // Move event row from tracked to ignored tab
    function moveEventRowToIgnored(eventKey) {
        var row = $('#clickwise-tracked-view .clickwise-track-event[data-key="' + eventKey + '"]').closest('tr');
        if (row.length > 0) {
            var eventData = extractRowData(row);

            // Remove from tracked view
            row.fadeOut(300, function () {
                $(this).remove();
                checkEmptyState('#clickwise-tracked-view', 6, 'No tracked events yet.');
            });

            // Add to ignored view
            setTimeout(() => {
                addToIgnoredView(eventData);
            }, 300);
        }
    }

    // Move event row from ignored to tracked tab
    function moveEventRowToTracked(eventKey) {
        var row = $('#clickwise-ignored-view .clickwise-track-event[data-key="' + eventKey + '"]').closest('tr');
        if (row.length > 0) {
            var eventData = extractRowData(row);

            // Remove from ignored view
            row.fadeOut(300, function () {
                $(this).remove();
                checkEmptyState('#clickwise-ignored-view', 5, 'No ignored events.');
            });

            // Add to tracked view
            setTimeout(() => {
                addToTrackedView(eventData);
            }, 300);
        }
    }

    // Extract event data from table row
    function extractRowData(row) {
        var button = row.find('.clickwise-track-event');
        var cells = row.find('td');

        return {
            key: button.data('key'),
            name: button.data('name'),
            alias: cells.eq(0).find('strong').text() || cells.eq(0).text(),
            originalName: cells.eq(1).text() || button.data('name'),
            type: cells.eq(2).text(),
            selector: cells.eq(3).find('code').text() || ''
        };
    }

    // Add event to tracked view
    function addToTrackedView(eventData) {
        var tbody = $('#clickwise-tracked-view tbody');

        // Remove empty message if present
        if (tbody.find('td[colspan]').length > 0) {
            tbody.empty();
        }

        var newRow = $('<tr style="display:none;">' +
            '<th scope="row" class="check-column"><input type="checkbox" name="keys[]" value="' + eventData.key + '"></th>' +
            '<td><strong>' + (eventData.alias || eventData.name) + '</strong></td>' +
            '<td>' + eventData.originalName + '</td>' +
            '<td>' + eventData.type + '</td>' +
            '<td><code>' + eventData.selector + '</code></td>' +
            '<td>' +
            '<div class="button-group">' +
            '<button type="button" class="button clickwise-open-details" data-key="' + eventData.key + '">Details / Edit</button>' +
            '<button type="button" class="button button-primary clickwise-track-event" data-key="' + eventData.key + '" data-name="' + eventData.name + '" data-action="untrack" data-status="tracked">Untrack</button>' +
            '</div>' +
            '</td>' +
            '</tr>');

        tbody.append(newRow);
        newRow.fadeIn(300);
    }

    // Add event to ignored view
    function addToIgnoredView(eventData) {
        var tbody = $('#clickwise-ignored-view tbody');

        // Remove empty message if present
        if (tbody.find('td[colspan]').length > 0) {
            tbody.empty();
        }

        var newRow = $('<tr style="display:none;">' +
            '<th scope="row" class="check-column"><input type="checkbox" name="keys[]" value="' + eventData.key + '"></th>' +
            '<td>' + eventData.originalName + '</td>' +
            '<td>' + eventData.type + '</td>' +
            '<td><code>' + eventData.selector + '</code></td>' +
            '<td>' +
            '<div class="button-group">' +
            '<button type="button" class="button clickwise-open-details" data-key="' + eventData.key + '">Details / Edit</button>' +
            '<button type="button" class="button button-primary clickwise-track-event" data-key="' + eventData.key + '" data-name="' + eventData.name + '" data-action="track" data-status="ignored">Track</button>' +
            '</div>' +
            '</td>' +
            '</tr>');

        tbody.append(newRow);
        newRow.fadeIn(300);
    }

    // Check if table is empty and show appropriate message
    function checkEmptyState(sectionSelector, colspan, message) {
        var tbody = $(sectionSelector + ' tbody');
        if (tbody.find('tr').length === 0) {
            tbody.html('<tr><td colspan="' + colspan + '">' + message + '</td></tr>');
        }
    }

    // Update status indicators in history section
    function updateHistoryStatus(eventKey, newStatus) {
        var historyRow = $('tr[data-status] .clickwise-track-event[data-key="' + eventKey + '"]').closest('tr');

        if (historyRow.length > 0) {
            historyRow.attr('data-status', newStatus);

            // Update status cell - it's the second td (after checkbox)
            var statusCell = historyRow.find('td').eq(0);
            var statusHtml = '';

            if (newStatus === 'tracked') {
                statusHtml = '<span class="dashicons dashicons-yes" style="color:green;"></span> <strong style="color:green;">Tracked</strong>';
            } else if (newStatus === 'ignored') {
                statusHtml = '<span class="dashicons dashicons-no" style="color:red;"></span> <span style="color:red;">Ignored</span>';
            } else {
                statusHtml = '<span class="dashicons dashicons-minus" style="color:orange;"></span> Pending';
            }

            statusCell.html(statusHtml);

            // Update button in history row
            var historyButton = historyRow.find('.clickwise-track-event');
            updateButton(historyButton, newStatus);

            // Add visual feedback
            historyRow.addClass('clickwise-row-updated');
            setTimeout(() => {
                historyRow.removeClass('clickwise-row-updated');
            }, 2000);
        }
    }

    // Update other buttons with same event key
    function updateOtherButtons(eventKey, newStatus) {
        $('.clickwise-track-event[data-key="' + eventKey + '"]').each(function () {
            var btn = $(this);
            if (btn.data('status') !== undefined) {
                updateButton(btn, newStatus);
            }
        });
    }

    // Open Event Details Modal
    $(document).on('click', '.clickwise-open-details', function () {
        var button = $(this);
        var key = button.data('key');
        var event = clickwise_admin.events[key];

        if (!event) {
            alert('Event data not found.');
            return;
        }

        $('#modal-event-type').text(event.type);
        $('#modal-event-name').text(event.name);
        $('#modal-event-selector').text(event.selector || '-');

        // Robust JSON Parsing & Highlighting
        var detailHtml = '';
        try {
            var raw = event.example_detail || event.example; // Try new column name first, fallback to old
            var parsed = raw ? parsePotentialJSON(raw) : {};
            detailHtml = syntaxHighlight(parsed);
        } catch (e) {
            detailHtml = event.example_detail || event.example || '{}';
        }
        $('#modal-event-detail').html(detailHtml);

        $('#modal-event-alias').val(event.alias || '');
        $('#modal-event-status').val(event.status);

        // Store key for save
        $('#clickwise-modal-save').data('key', key);

        // Capture initial state
        initialModalState = getModalState();

        // Show modal (flex to center)
        $('#clickwise-event-modal').css('display', 'flex').hide().fadeIn();
    });

    // Close Modal Actions
    $('#clickwise-modal-cancel, #clickwise-modal-close-x').on('click', function () {
        closeModal();
    });

    // Click Outside to Close (Fix for text selection bug)
    $('#clickwise-event-modal').on('mousedown', function (e) {
        modalMouseDownTarget = e.target;
    });

    $('#clickwise-event-modal').on('click', function (e) {
        // Only close if the click started AND ended on the overlay background
        if ($(e.target).is('#clickwise-event-modal') && $(modalMouseDownTarget).is('#clickwise-event-modal')) {
            closeModal();
        }
    });

    // --- Event Manager UI Logic ---

    // Tab Switching (Tracked vs History)
    $(document).on('click', '.clickwise-sub-tab', function (e) {
        e.preventDefault();
        var target = $(this).data('target');

        $('.clickwise-sub-tab').removeClass('active').css({ background: '#f1f1f1', color: '#555', borderBottom: '1px solid #ccc' });
        $(this).addClass('active').css({ background: '#fff', color: '#000', borderBottom: 'none' });

        $('.clickwise-sub-view').hide();
        $('#' + target).show();
    });

    // Select All Checkbox
    $(document).on('change', '.clickwise-select-all', function () {
        var isChecked = $(this).is(':checked');
        $(this).closest('table').find('input[name="keys[]"]').prop('checked', isChecked);
    });

    // Bulk Actions
    $(document).on('click', '.clickwise-apply-bulk', function () {
        var container = $(this).closest('.clickwise-bulk-form');
        var action = container.find('select[name="bulk_action"]').val();
        var keys = [];

        container.find('input[name="keys[]"]:checked').each(function () {
            keys.push($(this).val());
        });

        if (action === '-1' || keys.length === 0) {
            alert('Please select an action and at least one event.');
            return;
        }

        if (action === 'delete' && !confirm('Are you sure you want to delete these events?')) {
            return;
        }

        var button = $(this);
        button.prop('disabled', true).text('Applying...');

        $.post(clickwise_admin.ajax_url, {
            action: 'clickwise_bulk_action',
            nonce: clickwise_admin.nonce,
            bulk_action: action,
            keys: keys
        }, function (response) {
            if (response.success) {
                location.reload();
            } else {
                alert('Error: ' + response.data);
                button.prop('disabled', false).text('Apply');
            }
        });
    });

    // Delete Session
    $(document).on('click', '.clickwise-delete-session', function (e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('Delete session clicked - new AJAX version');

        if (!confirm('Are you sure you want to delete this session and all its events? Tracked events captured in this session might be affected if they haven\'t been seen elsewhere.')) {
            return false;
        }

        var button = $(this);
        var sessionId = button.data('session');
        var sessionBlock = button.closest('.clickwise-session-block');

        // Use ButtonFeedback if available, otherwise fallback to simple text change
        var feedback = null;
        if (window.ClickwiseButtonFeedback) {
            feedback = new window.ClickwiseButtonFeedback(button);
            feedback.loading('Deleting...');
        } else {
            button.prop('disabled', true).text('Deleting...');
        }

        $.post(clickwise_admin.ajax_url, {
            action: 'clickwise_delete_session',
            nonce: clickwise_admin.nonce,
            session_id: sessionId
        }, function (response) {
            if (response.success) {
                // Show success feedback briefly
                if (feedback) {
                    feedback.success('Deleted!');
                } else {
                    button.text('Deleted!');
                }

                // Mark session as being deleted and smoothly remove
                sessionBlock.addClass('deleting');

                // Wait a moment for user to see success, then animate out
                setTimeout(() => {
                    // Use slideUp for smooth collapse animation
                    sessionBlock.slideUp({
                        duration: 600,
                        easing: 'swing',
                        complete: function () {
                            sessionBlock.remove();

                            // Check if this was the last session and show empty state
                            checkForEmptySessionList();

                            // Show success notification using form feedback system
                            showSessionDeletedNotification('Session deleted successfully!', 'success');
                        }
                    });
                }, 800); // Brief delay to show success state

            } else {
                // Show error feedback
                if (feedback) {
                    feedback.error('Failed to delete');
                } else {
                    button.prop('disabled', false).text('Delete Session');
                }

                // Show error notification
                showSessionDeletedNotification(response.data || 'Failed to delete session. Please try again.', 'error');
            }
        }).fail(function () {
            // Network error
            if (feedback) {
                feedback.error('Connection failed');
            } else {
                button.prop('disabled', false).text('Delete Session');
            }

            showSessionDeletedNotification('Connection failed. Please check your internet connection.', 'error');
        });
    });

    // Check if session list is empty and show appropriate message
    function checkForEmptySessionList() {
        const sessionContainer = $('.clickwise-session-block').closest('div');
        const remainingSessions = $('.clickwise-session-block').length;

        if (remainingSessions === 0) {
            // Add empty state message
            const emptyMessage = $('<p>No recording history found.</p>');
            sessionContainer.append(emptyMessage);
        }
    }

    // Show notification for session operations
    function showSessionDeletedNotification(message, type) {
        // Find or create notification container in the History tab
        let $container = $('.clickwise-notification-container');

        if ($container.length === 0) {
            // Create container in the main content area of history tab
            const $historyContent = $('#clickwise-sub-history');
            if ($historyContent.length > 0) {
                $container = $('<div class="clickwise-notification-container"></div>');
                $historyContent.prepend($container);
            } else {
                // Fallback: create after the first session block or at top of main panel
                const $target = $('.clickwise-session-block').first().length > 0
                    ? $('.clickwise-session-block').first()
                    : $('.clickwise-main-panel .clickwise-content').first();

                $container = $('<div class="clickwise-notification-container"></div>');
                $target.before($container);
            }
        }

        // Remove any existing notifications
        $container.find('.clickwise-inline-notification').remove();
        $container.removeClass('empty');

        const $notification = $(`
            <div class="clickwise-inline-notification clickwise-notification-${type}">
                <span class="clickwise-notification-icon"></span>
                <span class="clickwise-notification-message">${message}</span>
                <button type="button" class="clickwise-notification-close">&times;</button>
            </div>
        `);

        $container.append($notification);

        // Animate in
        setTimeout(() => {
            $notification.addClass('clickwise-notification-show');
        }, 50);

        // Auto-hide after delay
        const hideTimeout = setTimeout(() => {
            hideSessionNotification($notification, $container);
        }, type === 'error' ? 6000 : 4000);

        // Manual close
        $notification.find('.clickwise-notification-close').on('click', function () {
            clearTimeout(hideTimeout);
            hideSessionNotification($notification, $container);
        });
    }

    // Hide session notification and clean up container
    function hideSessionNotification($notification, $container) {
        $notification.removeClass('clickwise-notification-show');
        setTimeout(() => {
            $notification.remove();
            if ($container.find('.clickwise-inline-notification').length === 0) {
                $container.addClass('empty');
            }
        }, 300);
    }

    // Save Modal Changes
    $(document).on('click', '#clickwise-modal-save', function () {
        var button = $(this);
        var key = button.data('key');
        var alias = $('#modal-event-alias').val();
        var status = $('#modal-event-status').val();

        button.prop('disabled', true).text('Saving...');

        $.post(clickwise_admin.ajax_url, {
            action: 'clickwise_update_event_status',
            nonce: clickwise_admin.nonce,
            key: key,
            status: status,
            alias: alias
        }, function (response) {
            if (response.success) {
                // Update local data to reflect saved state so unsaved check passes if we were to keep it open (though we reload)
                initialModalState = getModalState();
                location.reload();
            } else {
                alert('Error: ' + response.data);
                button.prop('disabled', false).text('Save Changes');
            }
        });
    });

    // --- Event Manager Filter ---
    // (Removed in favor of Tracked vs History tabs)
});

// Admin Bar Toggle (Global function)
window.clickwiseToggleRecording = function (e) {
    e.preventDefault();
    jQuery.post(clickwise_admin.ajax_url, {
        action: 'clickwise_toggle_recording',
        nonce: clickwise_admin.nonce
    }, function (response) {
        if (response.success) {
            location.reload();
        } else {
            alert('Failed to toggle recording.');
        }
    });
};

window.initClickwiseSyntaxHighlighter = function () {
    var $ = jQuery;
    var $textarea = $('#clickwise-sandbox-props');

    // Check if already initialized to avoid double wrapping
    if ($textarea.length && !$textarea.parent().hasClass('clickwise-code-wrapper')) {
        // Wrap
        var $wrapper = $('<div class="clickwise-code-wrapper"></div>');
        var $backdrop = $('<pre class="clickwise-code-backdrop"></pre>');
        $textarea.wrap($wrapper);
        $textarea.before($backdrop);
        $textarea.addClass('clickwise-code-input');

        function syntaxHighlight(json) {
            if (typeof json !== 'string') {
                json = JSON.stringify(json, null, 2);
            }
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                var cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        function updateHighlight() {
            var text = $textarea.val();
            // Handle final newline
            if (text && text[text.length - 1] === "\n") {
                text += " ";
            }
            var highlighted = syntaxHighlight(text || '');
            $backdrop.html(highlighted);
        }

        $textarea.on('input', updateHighlight);
        $textarea.on('scroll', function () {
            $backdrop.scrollTop($textarea.scrollTop());
            $backdrop.scrollLeft($textarea.scrollLeft());
        });

        // Initial trigger
        updateHighlight();
    }
};

jQuery(document).ready(function ($) {
    window.initClickwiseSyntaxHighlighter();

    // Global variable for handler selection (accessible across all functions)
    window.selectedHandlers = new Set();

    // Auto-select all enabled handlers by default
    window.initializeDefaultHandlerSelection = function() {
        var $handlers = $('.clickwise-handler-chip:not(.disabled) input[type="checkbox"]');

        if ($handlers.length === 0) {
            return; // No sandbox handlers found
        }

        // Clear and reinitialize
        window.selectedHandlers.clear();

        $handlers.each(function() {
            var $checkbox = $(this);
            var handler = $checkbox.data('handler');

            $checkbox.prop('checked', true);
            window.selectedHandlers.add(handler);
        });

        updateHandlerCount();
    };

    // Ultra-Responsive Logo Animation System - Instant Restart on Every Click!
    var logoAnimations = [];
    var lastSaveTriggerTime = 0;
    var SAVE_DEBOUNCE_TIME = 300; // Only debounce save buttons, not direct logo clicks

    function setupAnimationEventListeners() {
        var $logo = $('#clickwise-admin-logo');
        if (!$logo.length) return;

        var logoElement = $logo[0];
        logoAnimations = Array.from(logoElement.querySelectorAll('animate, animateTransform'));

        console.log('🎯 Found', logoAnimations.length, 'SMIL animations for ultra-responsive control');

        logoAnimations.forEach(function(anim, index) {
            anim.addEventListener('beginEvent', function() {
                console.log('⚡ Animation', index, 'started:', anim.id);
            });

            anim.addEventListener('endEvent', function() {
                console.log('✅ Animation', index, 'finished:', anim.id);
            });
        });
    }

    function replayLogoAnimation(source) {
        var $logo = $('#clickwise-admin-logo');
        if (!$logo.length) return;

        var currentTime = Date.now();

        // Only debounce save button triggers, NEVER logo clicks for maximum spam-ability!
        if (source === 'button-click' || source === 'form-submit') {
            if ((currentTime - lastSaveTriggerTime) < SAVE_DEBOUNCE_TIME) {
                console.log('🚫 Save animation debounced - too soon (' + source + ')');
                return;
            }
            lastSaveTriggerTime = currentTime;
        }

        console.log('🚀 INSTANT logo animation restart! (source:', source + ')');

        // INSTANT animation restart - no delays, no queuing, no waiting!
        try {
            if (logoAnimations.length > 0) {
                // Immediately stop and restart all SMIL animations
                logoAnimations.forEach(function(anim) {
                    try {
                        // Force stop current animation
                        anim.endElement();
                    } catch (e) {
                        // Animation might not be running, that's fine
                    }
                });

                // Restart all animations immediately - no setTimeout delays!
                logoAnimations.forEach(function(anim) {
                    try {
                        anim.beginElement();
                    } catch (e) {
                        console.log('Could not restart animation:', e);
                    }
                });

                // Fun spam-click visual feedback
                if (source === 'logo-click') {
                    $logo.addClass('clickwise-spam-glow');
                    setTimeout(function() {
                        $logo.removeClass('clickwise-spam-glow');
                    }, 200);
                }

            } else {
                // CSS fallback for instant restart
                $logo.removeClass('clickwise-replay-animation');
                // Force DOM reflow for instant restart
                $logo[0].offsetHeight;
                $logo.addClass('clickwise-replay-animation');

                // Clean up CSS class after animation
                setTimeout(function() {
                    $logo.removeClass('clickwise-replay-animation');
                }, 600); // Match CSS animation duration
            }

        } catch (e) {
            console.log('Animation restart failed:', e);

            // Emergency CSS fallback
            $logo.removeClass('clickwise-replay-animation');
            $logo[0].offsetHeight; // Force reflow
            $logo.addClass('clickwise-replay-animation');
            setTimeout(function() {
                $logo.removeClass('clickwise-replay-animation');
            }, 600);
        }
    }

    // Initialize animation event listeners when DOM is ready
    setTimeout(setupAnimationEventListeners, 100);

    // Make logo clickable and animate on click
    $(document).on('click', '#clickwise-admin-logo', function(e) {
        e.preventDefault();
        replayLogoAnimation('logo-click');
    });

    // Bind to specific save buttons with enhanced debouncing
    $(document).on('click', '#submit, .clickwise-rule-save-btn, #clickwise-modal-save, input[type="submit"][name="submit"]', function () {
        console.log('Save button clicked');
        // Immediate trigger - no delays for responsiveness
        replayLogoAnimation('button-click');
    });

    // Form submission handler with smart debouncing
    $('.clickwise-admin-wrapper form').on('submit', function() {
        console.log('Form submitted');
        // Immediate trigger - debouncing happens inside the function
        replayLogoAnimation('form-submit');
    });

    // Modern Handler Selection Functionality
    function updateHandlerCount() {
        var count = window.selectedHandlers.size;
        var countElement = $('#selected-count');
        countElement.text(count + (count === 1 ? ' selected' : ' selected'));

        // Update count badge color based on selection
        if (count > 0) {
            countElement.css({
                'background-color': 'rgba(34, 211, 238, 0.2)',
                'border-color': 'rgba(34, 211, 238, 0.4)',
                'color': 'var(--cw-cyan-100)'
            });
        } else {
            countElement.css({
                'background-color': 'rgba(34, 211, 238, 0.1)',
                'border-color': 'rgba(34, 211, 238, 0.2)',
                'color': 'var(--cw-cyan-300)'
            });
        }
    }

    // Single click handler for the entire chip
    $(document).on('click', '.clickwise-handler-chip:not(.disabled)', function(e) {
        // Prevent event bubbling
        e.preventDefault();
        e.stopPropagation();

        var $chip = $(this);
        var $checkbox = $chip.find('input[type="checkbox"]');
        var handler = $checkbox.data('handler');

        // Toggle the checkbox state
        var newState = !$checkbox.prop('checked');
        $checkbox.prop('checked', newState);

        console.log('🎯 Handler toggled:', handler, newState);

        // Update selected handlers set
        if (newState) {
            window.selectedHandlers.add(handler);
            console.log('✅ Added handler:', handler);
        } else {
            window.selectedHandlers.delete(handler);
            console.log('❌ Removed handler:', handler);
        }

        updateHandlerCount();

        // Smooth visual feedback without awkward ending
        var $chipContent = $chip.find('.chip-content');

        // Quick scale animation for immediate feedback
        $chipContent.css('transform', 'scale(0.95)');
        setTimeout(function() {
            $chipContent.css('transform', '');
        }, 100);
    });

    // Initialize default handler selection (auto-select all enabled handlers)
    window.initializeDefaultHandlerSelection();

    // Simple fix: reinitialize whenever user interacts with sandbox area
    $(document).on('click focus', '.clickwise-sandbox', function() {
        setTimeout(window.initializeDefaultHandlerSelection, 50);
    });



});
