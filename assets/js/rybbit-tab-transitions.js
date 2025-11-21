/**
 * Rybbit Tab Smooth Transitions
 * Provides smooth loading feedback when navigating between tabs
 */
jQuery(document).ready(function($) {
    'use strict';

    // Add smooth transition effects to tab navigation
    function initTabTransitions() {
        // Get current tab from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentTab = urlParams.get('tab') || 'general';

        // Add click handlers to nav tabs
        $('.nav-tab-wrapper .nav-tab').on('click', function(e) {
            const clickedTab = $(this);
            const href = clickedTab.attr('href');

            // Skip if it's the current tab
            if (clickedTab.hasClass('nav-tab-active')) {
                e.preventDefault();
                return false;
            }

            // Add loading state
            $('.rybbit-tab-content').addClass('loading');
            clickedTab.closest('.nav-tab-wrapper').find('.nav-tab').removeClass('nav-tab-active');
            clickedTab.addClass('nav-tab-active');

            // Small delay to show loading state before redirect
            setTimeout(function() {
                window.location.href = href;
            }, 150);
        });

        // Fade in content when page loads
        $('.rybbit-tab-content').removeClass('loading');

        // Add smooth scroll to top when switching tabs
        if (window.location.hash === '#tab-switched') {
            $('html, body').animate({
                scrollTop: $('.nav-tab-wrapper').offset().top - 50
            }, 300);

            // Remove hash from URL
            if (history.replaceState) {
                history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        }
    }

    // Simple fade-in for content (no staggered animation)
    function fadeInContent() {
        $('.rybbit-tab-content').css('opacity', '1');
    }

    // Smooth height adjustment for dynamic content
    function adjustContentHeight() {
        const mainContent = $('.rybbit-main-content');
        const sidebar = $('.rybbit-sidebar');

        if (mainContent.length && sidebar.length) {
            const mainHeight = mainContent.outerHeight();
            const sidebarHeight = sidebar.outerHeight();
            const minHeight = Math.max(mainHeight, sidebarHeight, 500);

            $('.rybbit-settings-container').css('min-height', minHeight + 'px');
        }
    }

    // Initialize everything
    initTabTransitions();
    fadeInContent();
    adjustContentHeight();

    // Adjust height on window resize
    $(window).on('resize', adjustContentHeight);

    // Re-adjust height when content changes (e.g., expanding sections)
    $(document).on('DOMSubtreeModified', '.rybbit-main-content', function() {
        setTimeout(adjustContentHeight, 100);
    });

    // Modern observer for content changes (if supported)
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.target.closest('.rybbit-main-content')) {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                setTimeout(adjustContentHeight, 100);
            }
        });

        const mainContent = document.querySelector('.rybbit-main-content');
        if (mainContent) {
            observer.observe(mainContent, {
                childList: true,
                subtree: true
            });
        }
    }
});