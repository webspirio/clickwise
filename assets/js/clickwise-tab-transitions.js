/**
 * Clickwise Tab Smooth Transitions
 * Provides smooth loading feedback when navigating between tabs
 */
jQuery(document).ready(function ($) {
    'use strict';

    // Add smooth transition effects to tab navigation
    function initTabTransitions() {
        // Get current tab from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentTab = urlParams.get('tab') || 'general';

        // Add click handlers to nav tabs
        $('.clickwise-nav .clickwise-nav-item').on('click', function (e) {
            e.preventDefault();

            const clickedTab = $(this);
            const href = clickedTab.attr('href');

            // Skip if it's the current tab
            if (clickedTab.hasClass('active')) {
                return false;
            }

            // Add loading state
            $('.clickwise-body').addClass('loading');
            clickedTab.closest('.clickwise-nav').find('.clickwise-nav-item').removeClass('active');
            clickedTab.addClass('active');

            // AJAX Navigation
            fetch(clickedTab.prop('href'), {
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.text();
                })
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Replace body content (Main Panel + Sidebar)
                    const newBodyEl = doc.querySelector('.clickwise-body');
                    if (!newBodyEl) {
                        throw new Error('Invalid response structure: .clickwise-body not found');
                    }

                    $('.clickwise-body').html(newBodyEl.innerHTML);

                    // Re-initialize Pattern UI if present
                    if (window.initClickwisePatternUI) {
                        window.initClickwisePatternUI();
                    }

                    // Re-initialize Event Rules if present
                    if (window.initClickwiseEventRules) {
                        window.initClickwiseEventRules();
                    }

                    // Re-initialize Syntax Highlighter if present
                    if (window.initClickwiseSyntaxHighlighter) {
                        window.initClickwiseSyntaxHighlighter();
                    }

                    // Update URL
                    window.history.pushState({ href: href }, '', href);

                    // Remove loading state
                    $('.clickwise-body').removeClass('loading');
                })
                .catch(err => {
                    console.error('Tab load failed', err);
                    window.location.href = href; // Fallback
                });
        });

        // Handle Back Button
        window.onpopstate = function (event) {
            if (event.state && event.state.href) {
                window.location.href = event.state.href; // Simple reload for back button for now to ensure stability
            }
        };

        // Fade in content when page loads
        $('.clickwise-body').removeClass('loading');

        // Add smooth scroll to top when switching tabs
        if (window.location.hash === '#tab-switched') {
            $('html, body').animate({
                scrollTop: $('.clickwise-nav-container').offset().top - 50
            }, 300);

            // Remove hash from URL
            if (history.replaceState) {
                history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        }
    }

    // Simple fade-in for content (no staggered animation)
    function fadeInContent() {
        $('.clickwise-body').css('opacity', '1');
    }

    // Smooth height adjustment for dynamic content
    function adjustContentHeight() {
        const mainContent = $('.clickwise-main-panel');
        const sidebar = $('.clickwise-sidebar-panel');

        if (mainContent.length && sidebar.length) {
            const mainHeight = mainContent.outerHeight();
            const sidebarHeight = sidebar.outerHeight();
            const minHeight = Math.max(mainHeight, sidebarHeight, 500);

            $('.clickwise-admin-wrapper').css('min-height', minHeight + 'px');
        }
    }

    // Initialize everything
    initTabTransitions();
    fadeInContent();
    adjustContentHeight();
    // initRotatingTips(); // Disabled for consistency

    // Adjust height on window resize
    $(window).on('resize', adjustContentHeight);

    // Re-adjust height when content changes (e.g., expanding sections)
    $(document).on('DOMSubtreeModified', '.clickwise-main-panel', function () {
        setTimeout(adjustContentHeight, 100);
    });

    // Modern observer for content changes (if supported)
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function (mutations) {
            let shouldUpdate = false;
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList' && mutation.target.closest('.clickwise-main-panel')) {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                setTimeout(adjustContentHeight, 100);
            }
        });

        const mainContent = document.querySelector('.clickwise-main-panel');
        if (mainContent) {
            observer.observe(mainContent, {
                childList: true,
                subtree: true
            });
        }
    }

    // Rotating tips functionality
    function initRotatingTips() {
        const funTips = [
            'Analytics are like coffee - the more data points, the better the buzz! ☕',
            'Fun fact: The average user clicks 2,617 times per day. Are you tracking them? 🖱️',
            'A website without analytics is like driving with your eyes closed... but less fun! 🚗',
            'Pro tip: Users spend 70% of their time above the fold. Track those clicks! 📊',
            'Event tracking is like being a digital detective - every click tells a story! 🕵️',
            'Remember: Data without action is just expensive storage! 💾',
            'Your bounce rate called - it wants you to track more engagement events! 📞',
            "Analytics rule #1: If it moves, track it. If it doesn't move, track why not! 🎯",
            'Users are like cats - they do unexpected things. Analytics help you understand why! 🐱',
            'Good analytics are like a GPS for your website - they show you where users really go! 🗺️',
            'Did you know? Properly tracked events can increase conversion rates by up to 30%! 📈',
            'Hot tip: The best analytics setup is the one you actually use! 🔥',
            'Analytics wisdom: Every click is a conversation with your users. Listen carefully! 👂'
        ];

        const tipElement = $('#clickwise-rotating-tip');
        if (tipElement.length === 0) return;

        let currentTipIndex = 0;

        function rotateTip() {
            tipElement.fadeOut(300, function () {
                currentTipIndex = (currentTipIndex + 1) % funTips.length;
                tipElement.text(funTips[currentTipIndex]).fadeIn(300);
            });
        }

        // Rotate tips every 15 seconds
        setInterval(rotateTip, 15000);

        // Add click handler to manually cycle through tips
        $('.clickwise-fun-fact').css('cursor', 'pointer').attr('title', 'Click for another tip!');
        $('.clickwise-fun-fact').on('click', function (e) {
            e.preventDefault();
            rotateTip();
        });
    }
});