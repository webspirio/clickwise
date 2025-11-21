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

    function logSandbox(msg, type) {
        var log = $('#clickwise-sandbox-log');
        var time = new Date().toLocaleTimeString();
        var color = type === 'error' ? '#d63638' : (type === 'success' ? '#00a32a' : '#2271b1');
        var line = $('<div style="margin-bottom:5px; border-bottom:1px solid #ddd; padding-bottom:5px;"></div>');
        line.append('<span style="color:#666; margin-right:10px;">[' + time + ']</span>');
        line.append('<span style="color:' + color + ';">' + msg + '</span>');
        log.prepend(line);
    }

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

    // Sandbox Send Event
    $(document).on('click', '#clickwise-sandbox-send', function () {
        var button = $(this);
        var name = $('#clickwise-sandbox-name').val();
        var propsStr = $('#clickwise-sandbox-props').val();
        var props = {};

        if (!name) {
            alert('Please enter an event name.');
            return;
        }

        try {
            if (propsStr) {
                props = JSON.parse(propsStr);
            }
        } catch (e) {
            alert('Invalid JSON in properties.');
            return;
        }

        button.prop('disabled', true).text('Sending...');

        loadClickwiseScript().then(function () {
            try {
                window.rybbit.event(name, props);
                logSandbox('Event "' + name + '" sent successfully.', 'success');
                logSandbox('Props: ' + JSON.stringify(props), 'info');
            } catch (e) {
                logSandbox('Error executing event: ' + e.message, 'error');
            }
            button.prop('disabled', false).text('Send Custom Event');
        }).catch(function (err) {
            logSandbox('Failed to load script: ' + err, 'error');
            button.prop('disabled', false).text('Send Custom Event');
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
            var raw = event.example;
            var parsed = raw ? parsePotentialJSON(raw) : {};
            detailHtml = syntaxHighlight(parsed);
        } catch (e) {
            detailHtml = event.example || '{}';
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
    $(document).on('click', '.clickwise-delete-session', function () {
        if (!confirm('Are you sure you want to delete this session and all its events? Tracked events captured in this session might be affected if they haven\'t been seen elsewhere.')) {
            return;
        }

        var button = $(this);
        var sessionId = button.data('session');
        button.prop('disabled', true).text('Deleting...');

        $.post(clickwise_admin.ajax_url, {
            action: 'clickwise_delete_session',
            nonce: clickwise_admin.nonce,
            session_id: sessionId
        }, function (response) {
            if (response.success) {
                location.reload();
            } else {
                alert('Error: ' + response.data);
                button.prop('disabled', false).text('Delete Session');
            }
        });
    });

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
