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
        $('.nav-tab-wrapper .nav-tab').on('click', function (e) {
            e.preventDefault();

            const clickedTab = $(this);
            const href = clickedTab.attr('href');

            // Skip if it's the current tab
            if (clickedTab.hasClass('nav-tab-active')) {
                return false;
            }

            // Add loading state
            $('.clickwise-tab-content').addClass('loading');
            clickedTab.closest('.nav-tab-wrapper').find('.nav-tab').removeClass('nav-tab-active');
            clickedTab.addClass('nav-tab-active');

            // AJAX Navigation
            fetch(href)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Replace main content
                    const newContentEl = doc.querySelector('.clickwise-main-content');
                    if (!newContentEl) {
                        throw new Error('Invalid response structure');
                    }

                    $('.clickwise-main-content').html(newContentEl.innerHTML);

                    // Replace tips in sidebar
                    const newTipsEl = doc.querySelector('#clickwise-tips-content');
                    if (newTipsEl) {
                        $('#clickwise-tips-content').html(newTipsEl.innerHTML);
                    }

                    // Re-initialize Pattern UI if present
                    if (window.initClickwisePatternUI) {
                        window.initClickwisePatternUI();
                    }

                    // Update URL
                    window.history.pushState({ href: href }, '', href);

                    // Remove loading state
                    $('.clickwise-tab-content').removeClass('loading');
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
        $('.clickwise-tab-content').removeClass('loading');

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
        $('.clickwise-tab-content').css('opacity', '1');
    }

    // Smooth height adjustment for dynamic content
    function adjustContentHeight() {
        const mainContent = $('.clickwise-main-content');
        const sidebar = $('.clickwise-sidebar');

        if (mainContent.length && sidebar.length) {
            const mainHeight = mainContent.outerHeight();
            const sidebarHeight = sidebar.outerHeight();
            const minHeight = Math.max(mainHeight, sidebarHeight, 500);

            $('.clickwise-settings-container').css('min-height', minHeight + 'px');
        }
    }

    // Initialize everything
    initTabTransitions();
    fadeInContent();
    adjustContentHeight();
    initRotatingTips();

    // Adjust height on window resize
    $(window).on('resize', adjustContentHeight);

    // Re-adjust height when content changes (e.g., expanding sections)
    $(document).on('DOMSubtreeModified', '.clickwise-main-content', function () {
        setTimeout(adjustContentHeight, 100);
    });

    // Modern observer for content changes (if supported)
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function (mutations) {
            let shouldUpdate = false;
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList' && mutation.target.closest('.clickwise-main-content')) {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                setTimeout(adjustContentHeight, 100);
            }
        });

        const mainContent = document.querySelector('.clickwise-main-content');
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