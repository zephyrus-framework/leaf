/**
 * Sidebar scroll-to-active, TOC scroll tracking, and mobile navigation.
 *
 * 1. Scrolls the sidebar (never the page) so the active link is centred in it on page load.
 * 2. Tracks scroll position to highlight the current heading in the TOC.
 * 3. Handles mobile hamburger menu and sidebar drawer.
 */
(function () {
    'use strict';

    var drawerQuery = window.matchMedia('(max-width: 768px)');

    // ── Sidebar: centre the active link ────────────────────────
    // Only the sidebar's own scrollTop moves: scrollIntoView would also scroll the page and move the Tab start point.
    var activeLink = document.querySelector('.docs-sidebar .sidebar-link.active');
    if (activeLink) {
        setTimeout(function () {
            if (drawerQuery.matches) return;
            var sidebar = activeLink.closest('.docs-sidebar');
            var linkBox = activeLink.getBoundingClientRect();
            sidebar.scrollTop += linkBox.top - sidebar.getBoundingClientRect().top - (sidebar.clientHeight - linkBox.height) / 2;
        }, 50);
    }

    // ── TOC: scroll-spy for heading tracking ───────────────────
    var tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length > 0) {
        var headingIds = [];
        tocLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                headingIds.push(href.substring(1));
            }
        });

        if (headingIds.length > 0) {
            var navHeight = parseInt(
                getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '64',
                10
            );
            var offset = navHeight + 32;

            function updateActiveToc() {
                var currentId = null;
                var scrollY = window.scrollY || window.pageYOffset;

                for (var i = headingIds.length - 1; i >= 0; i--) {
                    var el = document.getElementById(headingIds[i]);
                    if (el && el.getBoundingClientRect().top <= offset) {
                        currentId = headingIds[i];
                        break;
                    }
                }

                if (currentId === null && scrollY < 100) {
                    currentId = headingIds[0];
                }

                tocLinks.forEach(function (link) {
                    var href = link.getAttribute('href');
                    if (href === '#' + currentId) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }

            var ticking = false;
            window.addEventListener('scroll', function () {
                if (!ticking) {
                    requestAnimationFrame(function () {
                        updateActiveToc();
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });

            updateActiveToc();
        }
    }

    // ── Mobile: nav toggle (hamburger opens sidebar) ───────────
    var navToggle = document.querySelector('.nav-toggle');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');

    window.toggleNav = function () {
        var sidebar = document.querySelector('.docs-sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        var openIcon = document.querySelector('.nav-toggle-open');
        var closeIcon = document.querySelector('.nav-toggle-close');

        if (sidebar) {
            var isActive = sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active', isActive);
            if (openIcon) openIcon.style.display = isActive ? 'none' : 'block';
            if (closeIcon) closeIcon.style.display = isActive ? 'block' : 'none';
            if (navToggle) navToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
            document.body.style.overflow = isActive ? 'hidden' : '';
            if (isActive) {
                var target = sidebar.querySelector('.sidebar-link.active') || sidebar.querySelector('a[href]');
                if (target) target.focus();
            }
        }
    };

    window.closeSidebar = function () {
        var sidebar = document.querySelector('.docs-sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        var openIcon = document.querySelector('.nav-toggle-open');
        var closeIcon = document.querySelector('.nav-toggle-close');

        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (openIcon) openIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    // Escape closes the drawer and returns focus to its button, unless a layer above it took the key or is still open.
    document.addEventListener('keydown', function (e) {
        var sidebar = document.querySelector('.docs-sidebar');
        if (e.key !== 'Escape' || e.defaultPrevented || !sidebar || !sidebar.classList.contains('active')) return;
        if (document.querySelector('.search-overlay.active, .lang-switcher[data-open="true"]')) return;
        closeSidebar();
        if (navToggle) navToggle.focus();
    });

    // Focus moving outside the open drawer, its button and the search dialog closes the drawer without moving it back.
    document.addEventListener('focusout', function (e) {
        var sidebar = document.querySelector('.docs-sidebar');
        var next = e.relatedTarget;
        if (!sidebar || !sidebar.classList.contains('active') || !next || !next.closest) return;
        if (next.closest('.docs-sidebar, .nav-toggle, .search-overlay')) return;
        closeSidebar();
    });

    // Close sidebar when a link is clicked (mobile)
    document.querySelectorAll('.sidebar-link').forEach(function (link) {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // Close sidebar on window resize if going back to desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
})();
