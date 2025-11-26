/**
 * Clickwise Admin Bar Handler
 * Handles the Start/Stop Recording button in the WP Admin Bar
 */
// Define globally to avoid scope issues
window.clickwiseToggleRecording = function (e) {
    if (e) e.preventDefault();

    // Check if recorder is active on page
    if (window.clickwiseRecorder) {
        if (window.clickwiseRecorder.isRecording && typeof window.clickwiseRecorder.stopRecording === 'function') {
            window.clickwiseRecorder.stopRecording();
        } else if (typeof window.clickwiseRecorder.startNewSession === 'function') {
            window.clickwiseRecorder.startNewSession();
        }
        return;
    }

    // Fallback for when recorder script isn't loaded (e.g. starting recording)

    // Try to get config from various sources, prioritizing the specific one
    const config = window.clickwiseAdminBarSettings || window.clickwise_config || window.clickwiseSettings;

    if (!config) {
        console.error('Clickwise: Configuration not found. Ensure clickwise-admin-bar.js is enqueued correctly.');
        return;
    }

    const ajaxUrl = config.ajaxUrl || config.ajax_url;
    const nonce = config.nonce;

    if (!ajaxUrl || !nonce) {
        console.error('Clickwise: AJAX configuration missing', config);
        return;
    }

    // Visual feedback on the button
    const link = e.target.closest('a');
    const originalText = link ? link.innerText : '';
    if (link) {
        link.innerText = 'Processing...';
        link.style.opacity = '0.7';
        link.style.cursor = 'wait';
    }

    const data = new FormData();
    data.append('action', 'clickwise_toggle_recording');
    data.append('nonce', nonce);

    fetch(ajaxUrl, {
        method: 'POST',
        body: data
    })
        .then(response => response.json())
        .then(response => {
            if (response.success) {
                // Clear any previous session data to ensure a fresh start
                localStorage.removeItem('clickwise_overlay_data');

                // Reload to reflect state change (overlay appears/disappears)
                window.location.reload();
            } else {
                console.error('Clickwise: Toggle failed', response);
                alert('Failed to toggle recording: ' + (response.data || 'Unknown error'));
                if (link) {
                    link.innerText = originalText;
                    link.style.opacity = '1';
                    link.style.cursor = 'pointer';
                }
            }
        })
        .catch(err => {
            console.error('Clickwise: Toggle error', err);
            alert('Error toggling recording. Check console for details.');
            if (link) {
                link.innerText = originalText;
                link.style.opacity = '1';
                link.style.cursor = 'pointer';
            }
        });
};
