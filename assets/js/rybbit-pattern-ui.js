jQuery(document).ready(function ($) {
    $('.rybbit-pattern-ui-container').each(function () {
        const container = $(this);
        const textarea = container.find('textarea.rybbit-pattern-source');
        const list = container.find('.rybbit-pattern-list');
        const input = container.find('.rybbit-new-pattern-input');
        const addButton = container.find('.rybbit-add-pattern-btn');

        // Initialize list from textarea
        function renderList() {
            const patterns = textarea.val().split('\n').filter(line => line.trim() !== '');
            list.empty();

            if (patterns.length === 0) {
                list.append('<li class="rybbit-empty-list-message">No patterns added yet.</li>');
            } else {
                patterns.forEach(pattern => {
                    const item = $('<li class="rybbit-pattern-item"></li>');
                    item.append('<span class="rybbit-pattern-text">' + escapeHtml(pattern) + '</span>');
                    item.append('<span class="rybbit-remove-pattern dashicons dashicons-no-alt" title="Remove"></span>');
                    list.append(item);
                });
            }
        }

        // Add pattern
        function addPattern() {
            const pattern = input.val().trim();
            if (pattern) {
                const currentPatterns = textarea.val().split('\n').filter(line => line.trim() !== '');
                if (!currentPatterns.includes(pattern)) {
                    currentPatterns.push(pattern);
                    textarea.val(currentPatterns.join('\n'));
                    renderList();
                    input.val('');
                } else {
                    alert('Pattern already exists.');
                }
            }
        }

        // Remove pattern
        list.on('click', '.rybbit-remove-pattern', function () {
            const patternToRemove = $(this).siblings('.rybbit-pattern-text').text();
            const currentPatterns = textarea.val().split('\n').filter(line => line.trim() !== '');
            const newPatterns = currentPatterns.filter(p => p !== patternToRemove);
            textarea.val(newPatterns.join('\n'));
            renderList();
        });

        // Event listeners
        addButton.on('click', addPattern);
        input.on('keypress', function (e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                addPattern();
            }
        });

        // Initial render
        renderList();
    });

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
