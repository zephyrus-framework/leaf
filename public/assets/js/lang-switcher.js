(function () {
    'use strict';

    // Expose the click handler used by the inline onclick= in nav.latte.
    window.toggleLangSwitcher = function (btn) {
        var host = btn.closest('.lang-switcher');
        if (!host) return;
        var menu = host.querySelector('.lang-switcher-menu');
        if (!menu) return;
        var isOpen = host.getAttribute('data-open') === 'true';
        closeAll();
        if (!isOpen) {
            host.setAttribute('data-open', 'true');
            menu.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
        }
    };

    function closeAll() {
        document.querySelectorAll('.lang-switcher[data-open="true"]').forEach(function (el) {
            el.setAttribute('data-open', 'false');
            var menu = el.querySelector('.lang-switcher-menu');
            var btn = el.querySelector('.lang-switcher-button');
            if (menu) menu.hidden = true;
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    }

    // Close on outside click or Escape.
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.lang-switcher')) closeAll();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll();
    });

    // Path of the configured base URL, which may be absolute: "https://example.com/docs/" gives "/docs".
    function basePathOf(baseUrl) {
        if (!baseUrl) return '';
        return new URL(baseUrl, window.location.origin).pathname.replace(/\/+$/, '');
    }

    // Pages are built as <path>/index.html: a link without the slash costs a redirect on a static host.
    function withTrailingSlash(path) {
        return /\/$|\.[a-z0-9]+$/i.test(path) ? path : path + '/';
    }

    // Rewrite option hrefs so switching keeps the user on the current page
    // (stripped of the base path and any locale prefix) rather than sending them back to root.
    document.addEventListener('DOMContentLoaded', function () {
        var host = document.querySelector('.lang-switcher');
        if (!host || host.getAttribute('data-locale-homes') === 'true') return;
        var supported = Array.prototype.map.call(
            host.querySelectorAll('.lang-switcher-option'),
            function (a) { return a.getAttribute('data-locale'); },
        );
        var defaultLocale = host.getAttribute('data-default') || '';
        var basePath = basePathOf(host.getAttribute('data-base-url') || '');
        var path = window.location.pathname || '/';
        if (basePath !== '' && (path === basePath || path.indexOf(basePath + '/') === 0)) {
            path = path.slice(basePath.length) || '/';
        }

        // Strip a leading /{supportedLocale}/ segment if present.
        var stripped = path;
        for (var i = 0; i < supported.length; i++) {
            var loc = supported[i];
            if (!loc) continue;
            if (stripped.indexOf('/' + loc + '/') === 0) {
                stripped = stripped.slice(loc.length + 1) || '/';
                break;
            }
            if (stripped === '/' + loc) {
                stripped = '/';
                break;
            }
        }

        host.querySelectorAll('.lang-switcher-option').forEach(function (a) {
            var loc = a.getAttribute('data-locale');
            if (!loc) return;
            a.href = basePath + (loc === defaultLocale ? '' : '/' + loc) + withTrailingSlash(stripped);
        });
    });
})();
