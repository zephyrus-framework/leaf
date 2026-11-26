/**
 * Client-side fuzzy search for documentation.
 *
 * Loads /docs/search.json on first open, then filters results as you type, matching titles, headings and the page text.
 * Supports keyboard navigation (up/down arrows, Enter, Escape).
 */
(function () {
    'use strict';

    var overlay = document.getElementById('search-overlay');
    var input = document.getElementById('search-input');
    var resultsContainer = document.getElementById('search-results');
    var searchIndex = null;
    var emptyLabel = resultsContainer ? resultsContainer.getAttribute('data-empty') || 'Type to search the documentation...' : '';
    var noResultsLabel = resultsContainer ? resultsContainer.getAttribute('data-no-results') || 'No results found for "{query}"' : '';
    var activeIndex = -1;
    var returnFocusTo = null;
    var SNIPPET_LENGTH = 120;

    if (!overlay || !input || !resultsContainer) return;

    // ── Public API (called from nav button) ────────────────────
    // Closing gives focus back to the opener: the button passed in, or what had focus before the shortcut.
    window.openSearch = function (opener) {
        returnFocusTo = opener || document.activeElement;
        overlay.classList.add('active');
        input.value = '';
        input.focus();
        renderEmpty();
        loadIndex();
    };

    window.closeSearch = function () {
        if (!overlay.classList.contains('active')) return;
        overlay.classList.remove('active');
        activeIndex = -1;
        input.blur();
        restoreFocus(returnFocusTo);
        returnFocusTo = null;
    };

    // A return point that can no longer take focus (a menu closed meanwhile) hands it to the control of its
    // collapsed container (aria-controls), else to the search button.
    function restoreFocus(target) {
        if (!target) return;
        target.focus();
        if (document.activeElement === target) return;
        for (var node = target.parentElement; node; node = node.parentElement) {
            var control = node.id ? document.querySelector('[aria-controls~="' + CSS.escape(node.id) + '"]') : null;
            if (control) control.focus();
            if (control && document.activeElement === control) return;
        }
        var trigger = document.querySelector('.search-trigger');
        if (trigger) trigger.focus();
    }

    // ── Keyboard shortcuts ─────────────────────────────────────
    document.addEventListener('keydown', function (e) {
        // Ctrl+K or Cmd+K to open
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (overlay.classList.contains('active')) {
                window.closeSearch();
            } else {
                window.openSearch();
            }
            return;
        }

        if (!overlay.classList.contains('active')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            window.closeSearch();
            return;
        }

        var items = resultsContainer.querySelectorAll('.search-result-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActiveItem(items);
        } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            var href = items[activeIndex].getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        }
    });

    // Close when clicking overlay background.
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            window.closeSearch();
        }
    });

    // Search on input.
    input.addEventListener('input', function () {
        var query = input.value.trim().toLowerCase();
        if (query.length < 2) {
            renderEmpty();
            return;
        }
        var results = search(query);
        renderResults(results, query);
    });

    // ── Search logic ───────────────────────────────────────────
    function search(query) {
        if (!searchIndex) return [];

        var terms = query.split(/\s+/);
        var scored = [];

        searchIndex.forEach(function (entry) {
            var score = 0;
            var titleLower = entry.title.toLowerCase();
            var excerptLower = entry.excerpt.toLowerCase();
            var contentLower = entry.contentLower;
            var headingsLower = entry.headings.map(function (h) { return h.toLowerCase(); });

            terms.forEach(function (term) {
                // Title match (high weight).
                if (titleLower.indexOf(term) !== -1) {
                    score += titleLower === term ? 100 : 50;
                }

                // Heading match (medium weight).
                headingsLower.forEach(function (h) {
                    if (h.indexOf(term) !== -1) score += 20;
                });

                // Excerpt match (low weight), else a match further down the page (lowest weight).
                if (excerptLower.indexOf(term) !== -1) {
                    score += 10;
                } else if (contentLower.indexOf(term) !== -1) {
                    score += 3;
                }

                // Section match.
                if (entry.section.indexOf(term) !== -1) {
                    score += 5;
                }
            });

            if (score > 0) {
                scored.push({ entry: entry, score: score });
            }
        });

        scored.sort(function (a, b) { return b.score - a.score; });
        return scored.slice(0, 10).map(function (s) { return s.entry; });
    }

    // ── Rendering ──────────────────────────────────────────────
    function renderEmpty() {
        activeIndex = -1;
        resultsContainer.innerHTML =
            '<div class="search-empty">' + escapeHtml(emptyLabel) + '</div>';
    }

    function renderResults(results, query) {
        activeIndex = -1;

        if (results.length === 0) {
            resultsContainer.innerHTML =
                '<div class="search-empty">' + escapeHtml(noResultsLabel).replace('{query}', function () { return escapeHtml(query); }) + '</div>';
            return;
        }

        var html = '';
        results.forEach(function (entry) {
            var sectionLabel = entry.section.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            html +=
                '<a href="' + entry.url.replace(/\/?$/, '/') + '" class="search-result-item">' +
                '<div class="search-result-title">' + highlight(entry.title, query) + '</div>' +
                '<div class="search-result-section">' + sectionLabel + '</div>' +
                '<div class="search-result-excerpt">' + highlight(snippet(entry, query), query) + '</div>' +
                '</a>';
        });
        resultsContainer.innerHTML = html;
    }

    function updateActiveItem(items) {
        items.forEach(function (item, i) {
            if (i === activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    // ── Helpers ─────────────────────────────────────────────────
    function loadIndex() {
        if (searchIndex) return;
        var searchUrl = (document.querySelector('meta[name="leaf-search-url"]') || {}).content;
        if (!searchUrl) {
            var baseUrl = (document.querySelector('meta[name="leaf-base-url"]') || {}).content || '';
            searchUrl = baseUrl + '/search.json';
        }
        fetch(searchUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                data.forEach(function (entry) { entry.contentLower = (entry.content || '').toLowerCase(); });
                searchIndex = data;
            })
            .catch(function () { searchIndex = []; });
    }

    function highlight(text, query) {
        var terms = query.split(/\s+/).filter(function (t) { return t.length > 0; });
        if (terms.length === 0) return escapeHtml(text);

        var escaped = escapeHtml(text);
        terms.forEach(function (term) {
            var re = new RegExp('(' + escapeRegex(escapeHtml(term)) + ')', 'gi');
            escaped = escaped.replace(re, '<mark style="background:var(--accent-glow);color:var(--accent-light);padding:0 2px;border-radius:2px;">$1</mark>');
        });
        return escaped;
    }

    function truncate(str, len) {
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    // The excerpt, or when no term shows in it, about SNIPPET_LENGTH characters of the page text around the first match.
    function snippet(entry, query) {
        var excerpt = truncate(entry.excerpt, SNIPPET_LENGTH);
        var terms = query.split(/\s+/).filter(function (t) { return t.length > 0; });
        var excerptLower = excerpt.toLowerCase();
        if (!entry.content || terms.some(function (t) { return excerptLower.indexOf(t) !== -1; })) return excerpt;

        var text = entry.content.replace(/\s+/g, ' ').trim();
        var textLower = text.toLowerCase();
        var at = -1;
        var length = 0;
        terms.forEach(function (t) {
            var i = textLower.indexOf(t);
            if (i !== -1 && (at === -1 || i < at)) { at = i; length = t.length; }
        });
        if (at === -1) return excerpt;

        var start = Math.max(0, at - Math.floor((SNIPPET_LENGTH - length) / 2));
        var end = Math.min(text.length, start + SNIPPET_LENGTH);
        start = Math.max(0, Math.min(start, end - SNIPPET_LENGTH));
        if (start > 0) {
            var wordStart = text.indexOf(' ', start - 1) + 1;
            start = wordStart > 0 && wordStart <= at ? wordStart : start;
        }
        if (end < text.length) {
            var wordEnd = text.lastIndexOf(' ', end);
            end = wordEnd >= at + length ? wordEnd : end;
        }
        return (start > 0 ? '…' : '') + text.substring(start, end).trim() + (end < text.length ? '…' : '');
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
})();
