/**
 * Clickwise Form Feedback System
 * Replaces WordPress notices with custom button feedback
 * Author: Webspirio (Oleksandr Chornous)
 * Copyright (c) 2025 Webspirio
 */

jQuery(document).ready(function($) {
    'use strict';

    // Hide WordPress notices immediately
    function hideWordPressNotices() {
        $('.notice, .settings-error, .is-dismissible, .notice-success, .notice-error').hide();
    }

    // Button state management
    function ButtonFeedback(button) {
        this.$button = $(button);
        this.originalText = this.$button.text();
        this.originalClasses = this.$button.attr('class');

        return this;
    }

    ButtonFeedback.prototype = {
        // Set loading state
        loading: function(text) {
            text = text || 'Saving...';
            this.$button
                .prop('disabled', true)
                .removeClass('clickwise-success clickwise-error')
                .addClass('clickwise-loading')
                .text(text);
            return this;
        },

        // Set success state
        success: function(text, duration) {
            text = text || 'Saved!';
            duration = duration || 2500;

            this.$button
                .prop('disabled', false)
                .removeClass('clickwise-loading clickwise-error')
                .addClass('clickwise-success')
                .text(text);

            // Reset after duration
            setTimeout(() => {
                this.reset();
            }, duration);

            return this;
        },

        // Set error state
        error: function(text, duration) {
            text = text || 'Error occurred';
            duration = duration || 4000;

            this.$button
                .prop('disabled', false)
                .removeClass('clickwise-loading clickwise-success')
                .addClass('clickwise-error')
                .text(text);

            // Reset after duration
            setTimeout(() => {
                this.reset();
            }, duration);

            return this;
        },

        // Reset to original state
        reset: function() {
            this.$button
                .prop('disabled', false)
                .attr('class', this.originalClasses)
                .text(this.originalText);
            return this;
        }
    };

    // Intercept form submissions
    function interceptFormSubmission() {
        $('.clickwise-admin-wrapper form').on('submit', function(e) {
            const $form = $(this);
            const $submitButton = $form.find('input[type="submit"], button[type="submit"]').first();

            if ($submitButton.length === 0) return;

            e.preventDefault();

            const feedback = new ButtonFeedback($submitButton);
            feedback.loading();

            // Hide any existing WordPress notices
            hideWordPressNotices();

            // Serialize form data
            const formData = $form.serialize();

            // Submit via AJAX
            $.ajax({
                url: $form.attr('action') || window.location.href,
                method: 'POST',
                data: formData,
                success: function(response) {
                    // Parse the response to detect success/error
                    const $responseHtml = $(response);
                    const $notices = $responseHtml.find('.notice, .settings-error');

                    let hasError = false;
                    let hasSuccess = false;
                    let message = '';
                    let errorDetails = [];

                    $notices.each(function() {
                        const $notice = $(this);
                        const noticeText = $notice.find('p').text() || $notice.text();

                        if ($notice.hasClass('notice-error') || $notice.hasClass('error')) {
                            hasError = true;
                            if (noticeText.trim()) {
                                errorDetails.push(noticeText.trim());
                            }
                        } else if ($notice.hasClass('notice-success') || $notice.hasClass('updated')) {
                            hasSuccess = true;
                            message = noticeText || 'Settings saved successfully';
                        }
                    });

                    // Combine error details into readable message
                    if (hasError && errorDetails.length > 0) {
                        message = errorDetails.join('. ');
                        // Clean up common WordPress error prefixes
                        message = message.replace(/^ERROR:\s*/i, '');
                        message = message.replace(/^Warning:\s*/i, '');
                    } else if (hasError) {
                        message = 'Settings could not be saved. Please check your inputs.';
                    }

                    // Check for PHP errors or issues in response
                    if (!hasError && !hasSuccess) {
                        if (response.indexOf('PHP Fatal error') !== -1 ||
                            response.indexOf('PHP Parse error') !== -1) {
                            hasError = true;
                            message = 'Server error: Invalid configuration detected. Please check your settings.';
                        } else if (response.indexOf('500 Internal Server Error') !== -1) {
                            hasError = true;
                            message = 'Internal server error occurred. Please try again or contact support.';
                        } else if (response.indexOf('403 Forbidden') !== -1) {
                            hasError = true;
                            message = 'Permission denied. Please log in again.';
                        } else {
                            // Assume success if no explicit error and response looks valid
                            hasSuccess = true;
                            message = 'Settings saved successfully';
                        }
                    }

                    if (hasError) {
                        feedback.error('Failed to save');
                        showInlineNotification(message, 'error');
                    } else if (hasSuccess) {
                        feedback.success('Saved!');
                        showInlineNotification(message, 'success');

                        // Update the current page content without full reload
                        updatePageContent($responseHtml);
                    }
                },
                error: function(xhr, status, error) {
                    let errorMessage = 'Failed to save settings';

                    if (xhr.status === 403) {
                        errorMessage = 'Permission denied. Please log in again.';
                    } else if (xhr.status === 500) {
                        errorMessage = 'Server error. Please try again or contact support.';
                    } else if (xhr.status === 0) {
                        errorMessage = 'Connection lost. Please check your internet connection.';
                    } else if (xhr.responseText) {
                        // Try to extract meaningful error from response
                        const match = xhr.responseText.match(/<p[^>]*>(.*?)<\/p>/);
                        if (match && match[1]) {
                            errorMessage = match[1].replace(/<[^>]*>/g, '');
                        }
                    }

                    feedback.error(errorMessage);
                    showInlineNotification(errorMessage, 'error');
                }
            });
        });
    }

    // Show inline notification
    function showInlineNotification(message, type) {
        // Remove any existing notifications
        $('.clickwise-inline-notification').remove();

        const $notification = $(`
            <div class="clickwise-inline-notification clickwise-notification-${type}">
                <span class="clickwise-notification-icon"></span>
                <span class="clickwise-notification-message">${message}</span>
                <button type="button" class="clickwise-notification-close">&times;</button>
            </div>
        `);

        // Insert after form
        $('.clickwise-admin-wrapper form').first().after($notification);

        // Animate in
        $notification.addClass('clickwise-notification-show');

        // Auto-hide after delay
        setTimeout(() => {
            $notification.removeClass('clickwise-notification-show');
            setTimeout(() => {
                $notification.remove();
            }, 300);
        }, type === 'error' ? 6000 : 4000);

        // Manual close
        $notification.find('.clickwise-notification-close').on('click', function() {
            $notification.removeClass('clickwise-notification-show');
            setTimeout(() => {
                $notification.remove();
            }, 300);
        });
    }

    // Update page content without full reload
    function updatePageContent($responseHtml) {
        // Update form values with any changes from server
        const $newForm = $responseHtml.find('.clickwise-admin-wrapper form').first();
        if ($newForm.length > 0) {
            const $currentForm = $('.clickwise-admin-wrapper form').first();

            // Update input values
            $newForm.find('input, select, textarea').each(function() {
                const $newInput = $(this);
                const name = $newInput.attr('name');
                if (name) {
                    const $currentInput = $currentForm.find(`[name="${name}"]`);
                    if ($currentInput.length > 0) {
                        if ($newInput.is(':checkbox, :radio')) {
                            $currentInput.prop('checked', $newInput.is(':checked'));
                        } else {
                            $currentInput.val($newInput.val());
                        }
                    }
                }
            });
        }
    }

    // Initialize
    function init() {
        // Hide WordPress notices immediately
        hideWordPressNotices();

        // Intercept form submissions
        interceptFormSubmission();

        // Hide any notices that appear after page load
        setTimeout(hideWordPressNotices, 100);

        // Also hide notices that might be added dynamically
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    hideWordPressNotices();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Start the system
    init();

    // Make ButtonFeedback globally available for other scripts
    window.ClickwiseButtonFeedback = ButtonFeedback;
});