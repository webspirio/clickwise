jQuery(document).ready(function ($) {
    window.initClickwisePatternUI = function () {
        $('.clickwise-pattern-ui-container').each(function () {
            const container = $(this);
            // Prevent double initialization
            if (container.data('clickwise-initialized')) return;
            container.data('clickwise-initialized', true);

            const textarea = container.find('textarea.clickwise-pattern-source');
            const list = container.find('.clickwise-pattern-list');
            const input = container.find('.clickwise-new-pattern-input');
            const addButton = container.find('.clickwise-add-pattern-btn');

            // Initialize list from textarea
            function renderList() {
                const patterns = textarea.val().split('\n').filter(line => line.trim() !== '');
                list.empty();

                if (patterns.length === 0) {
                    list.append('<li class="clickwise-empty-list-message">No patterns added yet.</li>');
                } else {
                    patterns.forEach(pattern => {
                        const item = $('<li class="clickwise-pattern-item"></li>');
                        item.append('<span class="clickwise-pattern-text">' + escapeHtml(pattern) + '</span>');
                        item.append('<span class="clickwise-remove-pattern dashicons dashicons-no-alt" title="Remove"></span>');
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
            list.on('click', '.clickwise-remove-pattern', function () {
                const patternToRemove = $(this).siblings('.clickwise-pattern-text').text();
                const currentPatterns = textarea.val().split('\n').filter(line => line.trim() !== '');
                const newPatterns = currentPatterns.filter(p => p !== patternToRemove);
                textarea.val(newPatterns.join('\n'));
                renderList();
            });

            // Event listeners
            addButton.off('click').on('click', addPattern); // Use off() to prevent duplicate listeners if re-initialized
            input.off('keypress').on('keypress', function (e) {
                if (e.which === 13) { // Enter key
                    e.preventDefault();
                    addPattern();
                }
            });

            // Initial render
            renderList();
        });
    };

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initialize on load
    window.initClickwisePatternUI();
});
