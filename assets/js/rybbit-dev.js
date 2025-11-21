/**
 * Webspirio Rybbit Analytics - Dev Mode
 * Handles Toasts and Console Logging
 */
(function () {
    'use strict';

    var config = window.rybbit_config || {};

    if (!config.dev_mode) return;

    initDevMode();

    function initDevMode() {
        patchRybbitEvent();
    }

    function patchRybbitEvent() {
        // Wait for rybbit to be defined
        if (typeof window.rybbit === 'undefined') {
            setTimeout(patchRybbitEvent, 200);
            return;
        }

        if (window.rybbit.event && !window.rybbit.event.isPatched) {
            var originalEvent = window.rybbit.event;
            window.rybbit.event = function (name, params) {
                console.group('Rybbit Analytics Event');
                console.log('Event Name:', name);
                console.log('Parameters:', params);
                console.groupEnd();

                showToast(name, params);

                return originalEvent.apply(this, arguments);
            };
            window.rybbit.event.isPatched = true;
            console.log('Rybbit Dev Mode: Event interceptor active.');
        }
    }

    function showToast(title, data) {
        var container = document.querySelector('.rybbit-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'rybbit-toast-container';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'rybbit-toast';

        var content = '<span class="rybbit-toast-title">' + escapeHtml(title) + '</span>';
        if (data) {
            var dataStr = JSON.stringify(data).substring(0, 100);
            if (JSON.stringify(data).length > 100) dataStr += '...';
            content += '<span class="rybbit-toast-meta">' + escapeHtml(dataStr) + '</span>';
        }

        toast.innerHTML = content;

        // Click to dismiss
        toast.onclick = function () {
            removeToast(toast);
        };

        container.appendChild(toast);

        // Auto dismiss after 5s
        setTimeout(function () {
            removeToast(toast);
        }, 5000);
    }

    function removeToast(toast) {
        toast.style.animation = 'rybbit-fade-out 0.3s ease-out forwards';
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

})();
