jQuery(document).ready(function ($) {
    $('#rybbit-test-connection').on('click', function () {
        var button = $(this);
        var url = $('#rybbit_script_url').val();
        var resultSpan = $('#rybbit-test-result');

        if (!url) {
            resultSpan.css('color', 'red').text('Please enter a URL first.');
            return;
        }

        button.prop('disabled', true).text('Testing...');
        resultSpan.text('');

        $.post(rybbit_admin.ajax_url, {
            action: 'rybbit_test_connection',
            nonce: rybbit_admin.nonce,
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

    // Update Event Status
    $('.rybbit-update-status').on('click', function () {
        var button = $(this);
        var key = button.data('key');
        var status = button.data('status');
        var row = button.closest('tr');

        $.post(rybbit_admin.ajax_url, {
            action: 'rybbit_update_event_status',
            nonce: rybbit_admin.nonce,
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
        $('#rybbit-event-modal').fadeOut();
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
    $(document).on('click', '.rybbit-open-details', function () {
        var button = $(this);
        var key = button.data('key');
        var event = rybbit_admin.events[key];

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
        $('#rybbit-modal-save').data('key', key);

        // Capture initial state
        initialModalState = getModalState();

        // Show modal (flex to center)
        $('#rybbit-event-modal').css('display', 'flex').hide().fadeIn();
    });

    // Close Modal Actions
    $('#rybbit-modal-cancel, #rybbit-modal-close-x').on('click', function () {
        closeModal();
    });

    // Click Outside to Close (Fix for text selection bug)
    $('#rybbit-event-modal').on('mousedown', function (e) {
        modalMouseDownTarget = e.target;
    });

    $('#rybbit-event-modal').on('click', function (e) {
        // Only close if the click started AND ended on the overlay background
        if ($(e.target).is('#rybbit-event-modal') && $(modalMouseDownTarget).is('#rybbit-event-modal')) {
            closeModal();
        }
    });

    // --- Event Manager UI Logic ---

    // Tab Switching (Tracked vs History)
    $('.rybbit-sub-tab').on('click', function (e) {
        e.preventDefault();
        var target = $(this).data('target');

        $('.rybbit-sub-tab').removeClass('active').css({ background: '#f1f1f1', color: '#555', borderBottom: '1px solid #ccc' });
        $(this).addClass('active').css({ background: '#fff', color: '#000', borderBottom: 'none' });

        $('.rybbit-sub-view').hide();
        $('#' + target).show();
    });

    // Select All Checkbox
    $('.rybbit-select-all').on('change', function () {
        var isChecked = $(this).is(':checked');
        $(this).closest('table').find('input[name="keys[]"]').prop('checked', isChecked);
    });

    // Bulk Actions
    $('.rybbit-apply-bulk').on('click', function () {
        var container = $(this).closest('.rybbit-bulk-form');
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

        $.post(rybbit_admin.ajax_url, {
            action: 'rybbit_bulk_action',
            nonce: rybbit_admin.nonce,
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
    $('.rybbit-delete-session').on('click', function () {
        if (!confirm('Are you sure you want to delete this session and all its events? Tracked events captured in this session might be affected if they haven\'t been seen elsewhere.')) {
            return;
        }

        var button = $(this);
        var sessionId = button.data('session');
        button.prop('disabled', true).text('Deleting...');

        $.post(rybbit_admin.ajax_url, {
            action: 'rybbit_delete_session',
            nonce: rybbit_admin.nonce,
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
    $('#rybbit-modal-save').on('click', function () {
        var button = $(this);
        var key = button.data('key');
        var alias = $('#modal-event-alias').val();
        var status = $('#modal-event-status').val();

        button.prop('disabled', true).text('Saving...');

        $.post(rybbit_admin.ajax_url, {
            action: 'rybbit_update_event_status',
            nonce: rybbit_admin.nonce,
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
window.rybbitToggleRecording = function (e) {
    e.preventDefault();
    jQuery.post(rybbit_admin.ajax_url, {
        action: 'rybbit_toggle_recording',
        nonce: rybbit_admin.nonce
    }, function (response) {
        if (response.success) {
            location.reload();
        } else {
            alert('Failed to toggle recording.');
        }
    });
};
