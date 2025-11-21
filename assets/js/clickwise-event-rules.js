/**
 * Clickwise Event Rules UI
 * Handles the sophisticated rule-based event matching system
 */
jQuery(document).ready(function ($) {
    let eventRules = [];
    let editingIndex = -1;

    // Initialize the rules UI
    window.initClickwiseEventRules = function () {
        const rulesData = $('.clickwise-rules-data').val();
        try {
            eventRules = rulesData ? JSON.parse(rulesData) : [];
        } catch (e) {
            eventRules = [];
            console.warn('Failed to parse event rules data:', e);
        }
        renderRulesList();
        updatePreview();
    }

    // Render the rules list
    function renderRulesList() {
        const container = $('.clickwise-rules-list');

        if (eventRules.length === 0) {
            container.html(`
                <div class="clickwise-rules-empty">
                    <div class="dashicons dashicons-admin-settings"></div>
                    <h4>No Event Rules Defined</h4>
                    <p>Add your first rule below to start automatically tracking custom events.</p>
                </div>
            `);
            return;
        }

        let html = '';
        eventRules.forEach((rule, index) => {
            const typeClass = rule.type || 'prefix';
            const typeLabel = {
                'prefix': 'Prefix',
                'contains': 'Contains',
                'exact': 'Exact',
                'regex': 'RegEx',
                'pattern': 'Pattern'
            }[rule.type] || 'Prefix';

            html += `
                <div class="clickwise-rule-item" data-index="${index}">
                    <span class="clickwise-rule-type ${typeClass}">${typeLabel}</span>
                    <div class="clickwise-rule-content">
                        <div class="clickwise-rule-value">${escapeHtml(rule.value || '')}</div>
                        ${rule.description ? `<div class="clickwise-rule-description">${escapeHtml(rule.description)}</div>` : ''}
                    </div>
                    <div class="clickwise-rule-edit-form">
                        <select class="rule-type-select">
                            <option value="prefix" ${rule.type === 'prefix' ? 'selected' : ''}>Prefix</option>
                            <option value="contains" ${rule.type === 'contains' ? 'selected' : ''}>Contains</option>
                            <option value="exact" ${rule.type === 'exact' ? 'selected' : ''}>Exact</option>
                            <option value="regex" ${rule.type === 'regex' ? 'selected' : ''}>RegEx</option>
                            <option value="pattern" ${rule.type === 'pattern' ? 'selected' : ''}>Pattern</option>
                        </select>
                        <input type="text" class="rule-value-input" value="${escapeHtml(rule.value || '')}" placeholder="Rule value">
                        <input type="text" class="rule-desc-input" value="${escapeHtml(rule.description || '')}" placeholder="Description (optional)">
                    </div>
                    <div class="clickwise-rule-actions">
                        <button type="button" class="clickwise-rule-edit-btn" data-index="${index}">
                            <span class="dashicons dashicons-edit-page"></span> Edit
                        </button>
                        <button type="button" class="clickwise-rule-delete-btn" data-index="${index}">
                            <span class="dashicons dashicons-trash"></span> Delete
                        </button>
                    </div>
                    <div class="clickwise-rule-edit-actions">
                        <button type="button" class="button button-primary clickwise-rule-save-btn" data-index="${index}">Save</button>
                        <button type="button" class="button clickwise-rule-cancel-btn" data-index="${index}">Cancel</button>
                    </div>
                </div>
            `;
        });

        container.html(html);
        saveRulesToField();
    }

    // Save rules to hidden field
    function saveRulesToField() {
        $('.clickwise-rules-data').val(JSON.stringify(eventRules));
    }

    // Add new rule
    function addRule() {
        const type = $('#new-rule-type').val();
        const value = $('#new-rule-value').val().trim();
        const description = $('#new-rule-desc').val().trim();

        if (!value) {
            alert('Please enter a rule value.');
            $('#new-rule-value').focus();
            return;
        }

        // Validate regex if type is regex
        if (type === 'regex') {
            try {
                new RegExp(value);
            } catch (e) {
                alert('Invalid regular expression: ' + e.message);
                $('#new-rule-value').focus();
                return;
            }
        }

        const rule = { type, value, description };
        eventRules.push(rule);

        // Clear form
        $('#new-rule-value').val('');
        $('#new-rule-desc').val('');
        $('#new-rule-type').val('prefix');
        updatePreview();

        renderRulesList();
        showSuccessMessage('Rule added successfully!');
    }

    // Delete rule
    function deleteRule(index) {
        if (!confirm('Are you sure you want to delete this rule?')) {
            return;
        }

        eventRules.splice(index, 1);
        renderRulesList();
        showSuccessMessage('Rule deleted successfully!');
    }

    // Edit rule
    function editRule(index) {
        if (editingIndex !== -1) {
            cancelEdit(editingIndex);
        }

        editingIndex = index;
        $(`.clickwise-rule-item[data-index="${index}"]`).addClass('editing');
    }

    // Save edited rule
    function saveRule(index) {
        const item = $(`.clickwise-rule-item[data-index="${index}"]`);
        const type = item.find('.rule-type-select').val();
        const value = item.find('.rule-value-input').val().trim();
        const description = item.find('.rule-desc-input').val().trim();

        if (!value) {
            alert('Please enter a rule value.');
            item.find('.rule-value-input').focus();
            return;
        }

        // Validate regex if type is regex
        if (type === 'regex') {
            try {
                new RegExp(value);
            } catch (e) {
                alert('Invalid regular expression: ' + e.message);
                item.find('.rule-value-input').focus();
                return;
            }
        }

        eventRules[index] = { type, value, description };
        editingIndex = -1;
        renderRulesList();
        showSuccessMessage('Rule updated successfully!');
    }

    // Cancel edit
    function cancelEdit(index) {
        editingIndex = -1;
        $(`.clickwise-rule-item[data-index="${index}"]`).removeClass('editing');
    }

    // Update live preview
    function updatePreview() {
        const type = $('#new-rule-type').val();
        const value = $('#new-rule-value').val().trim();
        const preview = $('#rule-preview');
        const previewText = $('#rule-preview-text');

        if (!value) {
            preview.hide();
            return;
        }

        let examples = [];
        switch (type) {
            case 'prefix':
                examples = [`"${value}button-click"`, `"${value}form-submit"`];
                break;
            case 'contains':
                examples = [`"contact-${value}"`, `"login-${value}-submit"`];
                break;
            case 'exact':
                examples = [`"${value}" only`];
                break;
            case 'regex':
                try {
                    new RegExp(value);
                    examples = ['Will match events using this regular expression'];
                } catch (e) {
                    examples = [`<span style="color: #d63638;">Invalid regex: ${e.message}</span>`];
                }
                break;
            case 'pattern':
                examples = [value.replace(/\*/g, '"anything"')];
                break;
        }

        previewText.html(`This will match: ${examples.join(', ')}`);
        preview.show();
    }

    // Show success message
    function showSuccessMessage(message) {
        // Create a temporary success message
        const successEl = $(`<div class="notice notice-success is-dismissible" style="margin: 10px 0;"><p>${message}</p></div>`);
        $('.clickwise-event-rules-container').prepend(successEl);

        setTimeout(() => {
            successEl.fadeOut(() => successEl.remove());
        }, 3000);
    }

    // Escape HTML
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Event handlers
    $(document).on('click', '#add-event-rule-btn', addRule);
    $(document).on('click', '.clickwise-rule-delete-btn', function () {
        deleteRule(parseInt($(this).data('index')));
    });
    $(document).on('click', '.clickwise-rule-edit-btn', function () {
        editRule(parseInt($(this).data('index')));
    });
    $(document).on('click', '.clickwise-rule-save-btn', function () {
        saveRule(parseInt($(this).data('index')));
    });
    $(document).on('click', '.clickwise-rule-cancel-btn', function () {
        cancelEdit(parseInt($(this).data('index')));
    });

    // Live preview updates
    $('#new-rule-type, #new-rule-value').on('input change', updatePreview);

    // Enter key in add rule form
    $('#new-rule-value, #new-rule-desc').on('keypress', function (e) {
        if (e.which === 13) {
            addRule();
        }
    });

    // Enter key in edit form
    $(document).on('keypress', '.rule-value-input, .rule-desc-input', function (e) {
        if (e.which === 13) {
            const index = parseInt($(this).closest('.clickwise-rule-item').data('index'));
            saveRule(index);
        }
    });

    // Escape key to cancel editing
    $(document).on('keyup', function (e) {
        if (e.which === 27 && editingIndex !== -1) {
            cancelEdit(editingIndex);
        }
    });

    // Initialize when page loads
    if ($('.clickwise-event-rules-container').length > 0) {
        window.initClickwiseEventRules();
    }
});