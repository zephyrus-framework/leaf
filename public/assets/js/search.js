/**
 * Client-side search of the site's pages.
 *
 * On first open, loads the index named by the leaf-search-url meta tag (the search.json of the page's locale), then
 * ranks titles, headings and the page text as you type. The first result is preselected: Enter opens it, the up and
 * down arrows move through the results, Escape closes. The field is an ARIA combobox that keeps the focus and names the
 * selected option of the results listbox in aria-activedescendant.
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
    var madeInert = [];
    var SNIPPET_LENGTH = 120;
    var ALPHANUMERIC = /[\p{L}\p{N}_]/u;

    if (!overlay || !input || !resultsContainer) return;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', resultsContainer.id);
    input.setAttribute('aria-expanded', 'false');

    // ── Public API (called from nav button) ────────────────────
    // Closing gives focus back to the opener: the button passed in, or what had focus before the shortcut.
    window.openSearch = function (opener) {
        returnFocusTo = opener || document.activeElement;
        overlay.classList.add('active');
        input.value = '';
        input.focus();
        setPageInert(true);
        renderEmpty();
        loadIndex();
    };

    window.closeSearch = function () {
        if (!overlay.classList.contains('active')) return;
        overlay.classList.remove('active');
        setPageInert(false);
        activeIndex = -1;
        input.blur();
        restoreFocus(returnFocusTo);
        returnFocusTo = null;
    };

    // While the search is open, everything around it leaves the tab order and the accessibility tree.
    function setPageInert(inert) {
        if (!inert) {
            madeInert.forEach(function (el) { el.removeAttribute('inert'); });
            madeInert = [];
            return;
        }
        for (var node = overlay; node !== document.body && node.parentElement; node = node.parentElement) {
            Array.prototype.forEach.call(node.parentElement.children, function (sibling) {
                if (sibling === node || sibling.tagName === 'SCRIPT' || sibling.hasAttribute('inert')) return;
                sibling.setAttribute('inert', '');
                madeInert.push(sibling);
            });
        }
    }

    // Tab and Shift+Tab wrap around the dialog's controls.
    function keepTabInDialog(e) {
        var controls = overlay.querySelectorAll('input, button, a[href]:not([tabindex="-1"])');
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

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

        if (e.key === 'Tab') {
            keepTabInDialog(e);
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
                window.closeSearch();
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

    // A result followed in this tab closes the search first, so the page Back returns to is not left inert.
    resultsContainer.addEventListener('click', function (e) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (e.target.closest('.search-result-item')) window.closeSearch();
    });

    // The pointer selects the result it moves over, but a scroll that brings another result under a still pointer does not.
    var lastPointer = '';
    resultsContainer.addEventListener('mousemove', function (e) {
        var at = e.clientX + ',' + e.clientY;
        if (at === lastPointer) return;
        lastPointer = at;
        var items = resultsContainer.querySelectorAll('.search-result-item');
        var index = Array.prototype.indexOf.call(items, e.target.closest('.search-result-item'));
        if (index === -1 || index === activeIndex) return;
        activeIndex = index;
        updateActiveItem(items, true);
    });

    input.addEventListener('input', runQuery);

    // The results of the field's query, from two characters on and once the index has arrived.
    function runQuery() {
        var query = input.value.trim().toLowerCase();
        if (query.length < 2 || !searchIndex) {
            renderEmpty();
            return;
        }
        var terms = query.split(/\s+/);
        renderResults(search(terms), query, terms);
    }

    // ── Search logic ───────────────────────────────────────────
    // Entries carrying more of the terms come first, then the highest score. A term in the title weighs most; elsewhere
    // a whole word weighs more than a word start or a part of a word, and the page text counts up to ten occurrences.
    function search(terms) {
        var scored = [];

        searchIndex.forEach(function (entry) {
            var found = 0;
            var score = 0;
            var titleLower = entry.title.toLowerCase();
            var excerptLower = entry.excerpt.toLowerCase();

            terms.forEach(function (term) {
                var termScore = titleLower === term ? 100 : (titleLower.indexOf(term) !== -1 ? 50 : 0);
                entry.headings.forEach(function (h) { termScore += 20 * occurrences(h.toLowerCase(), term, 1); });
                termScore += Math.max(10 * occurrences(excerptLower, term, 1), 3 * occurrences(entry.textLower, term, 10));
                termScore += 5 * occurrences(entry.section, term, 1);
                if (termScore > 0) found++;
                score += termScore;
            });

            if (found > 0) {
                scored.push({ entry: entry, found: found, score: score });
            }
        });

        scored.sort(function (a, b) { return b.found - a.found || b.score - a.score; });
        return scored.slice(0, 10).map(function (s) { return s.entry; });
    }

    // The occurrences of the term in the lowercase text, counted up to max: a whole word counts 1, a word start 0.5,
    // a part of a word 0.25.
    function occurrences(lower, term, max) {
        var count = 0;
        for (var at = lower.indexOf(term); at !== -1 && count < max; at = lower.indexOf(term, at + 1)) {
            var startsWord = !ALPHANUMERIC.test(lower.charAt(at - 1));
            var endsWord = !ALPHANUMERIC.test(lower.charAt(at + term.length));
            count += startsWord ? (endsWord ? 1 : 0.5) : 0.25;
        }
        return Math.min(count, max);
    }

    // ── Rendering ──────────────────────────────────────────────
    // Index values only ever reach the page as text nodes and checked attribute values, never as markup.
    function renderEmpty() {
        renderMessage(emptyLabel);
    }

    function renderMessage(text) {
        resultsContainer.replaceChildren(textBlock('search-empty', text, []));
        setExpanded(false);
    }

    function renderResults(results, query, terms) {
        if (results.length === 0) {
            renderMessage(noResultsLabel.replace('{query}', function () { return query; }));
            return;
        }

        resultsContainer.replaceChildren.apply(resultsContainer, results.map(function (entry, i) {
            var item = document.createElement('a');
            item.className = 'search-result-item';
            item.id = 'search-option-' + i;
            item.setAttribute('role', 'option');
            item.setAttribute('tabindex', '-1');
            item.setAttribute('href', entry.url.replace(/\/?$/, '/') + textFragment(entry, terms));
            item.appendChild(textBlock('search-result-title', entry.title, terms));
            item.appendChild(textBlock('search-result-section', entry.section.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }), []));
            item.appendChild(textBlock('search-result-excerpt', snippet(entry, terms), terms));
            return item;
        }));
        setExpanded(true);
    }

    // While it holds results, the container is the listbox the field controls, its first option selected.
    function setExpanded(expanded) {
        input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (expanded) {
            resultsContainer.setAttribute('role', 'listbox');
            if (input.hasAttribute('aria-label')) resultsContainer.setAttribute('aria-label', input.getAttribute('aria-label'));
        } else {
            resultsContainer.removeAttribute('role');
            resultsContainer.removeAttribute('aria-label');
        }
        activeIndex = expanded ? 0 : -1;
        updateActiveItem(resultsContainer.querySelectorAll('.search-result-item'));
    }

    // A block of text with every occurrence of the terms in a <mark>, the longest term first where several start.
    function textBlock(className, text, terms) {
        var block = document.createElement('div');
        block.className = className;
        var longestFirst = terms.slice().sort(function (a, b) { return b.length - a.length; });
        var pattern = terms.length > 0 ? new RegExp(longestFirst.map(escapeRegex).join('|'), 'gi') : null;
        var last = 0;
        var match;
        while (pattern && (match = pattern.exec(text)) !== null) {
            block.appendChild(document.createTextNode(text.slice(last, match.index)));
            var mark = document.createElement('mark');
            mark.textContent = match[0];
            block.appendChild(mark);
            last = pattern.lastIndex;
        }
        block.appendChild(document.createTextNode(text.slice(last)));
        return block;
    }

    function updateActiveItem(items, byPointer) {
        items.forEach(function (item, i) {
            var active = i === activeIndex;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', active ? 'true' : 'false');
            if (active && !byPointer) item.scrollIntoView({ block: 'nearest' });
        });
        if (items[activeIndex]) {
            input.setAttribute('aria-activedescendant', items[activeIndex].id);
        } else {
            input.removeAttribute('aria-activedescendant');
        }
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
                searchIndex = data.filter(isSearchableEntry);
                searchIndex.forEach(function (entry) {
                    entry.text = (typeof entry.content === 'string' ? entry.content : '').replace(/\s+/g, ' ').trim();
                    entry.textLower = entry.text.toLowerCase();
                });
            })
            .catch(function () { searchIndex = []; })
            .then(function () { if (input.value.trim() !== '') runQuery(); });
    }

    // An entry the search can read: a link to this site, string fields and a list of string headings.
    function isSearchableEntry(entry) {
        return entry !== null && typeof entry === 'object'
            && isSiteUrl(entry.url)
            && typeof entry.title === 'string'
            && typeof entry.section === 'string'
            && typeof entry.excerpt === 'string'
            && Array.isArray(entry.headings)
            && entry.headings.every(function (heading) { return typeof heading === 'string'; });
    }

    // A path on this site: one leading slash, never a second one (or a backslash) that would make it protocol-relative.
    function isSiteUrl(url) {
        if (typeof url !== 'string' || !/^\/(?![\/\\])/.test(url)) return false;
        try {
            return new URL(url, location.href).origin === location.origin;
        } catch (e) {
            return false;
        }
    }

    function truncate(str, len) {
        return str.length > len ? str.substring(0, len) + '…' : str;
    }

    function containsTerm(text, terms) {
        var lower = text.toLowerCase();
        return terms.some(function (t) { return lower.indexOf(t) !== -1; });
    }

    // The earliest match of a term in the page text, as { at, length }, or null.
    function firstMatch(entry, terms) {
        var found = null;
        terms.forEach(function (t) {
            var i = entry.textLower.indexOf(t);
            if (i !== -1 && (found === null || i < found.at)) found = { at: i, length: t.length };
        });
        return found;
    }

    // For a page found only in its body, a text fragment that opens it at the whole word around the first match.
    function textFragment(entry, terms) {
        if (containsTerm(entry.title, terms) || containsTerm(entry.excerpt, terms) || entry.headings.some(function (h) { return containsTerm(h, terms); })) return '';
        var match = firstMatch(entry, terms);
        if (match === null) return '';
        var start = match.at;
        var end = match.at + match.length;
        while (start > 0 && isWordCharacter(entry.text, start - 1)) start--;
        while (end < entry.text.length && isWordCharacter(entry.text, end)) end++;
        return '#:~:text=' + encodeURIComponent(entry.text.slice(start, end)).replace(/-/g, '%2D');
    }

    // Text fragments match whole words: letters and digits, joined by an apostrophe or a dot between two of them.
    function isWordCharacter(text, i) {
        return ALPHANUMERIC.test(text.charAt(i))
            || (/['’.]/.test(text.charAt(i)) && ALPHANUMERIC.test(text.charAt(i - 1)) && ALPHANUMERIC.test(text.charAt(i + 1)));
    }

    // The excerpt, or when no term shows in it, about SNIPPET_LENGTH characters of the page text around the first match.
    function snippet(entry, terms) {
        var excerpt = truncate(entry.excerpt, SNIPPET_LENGTH);
        if (entry.text === '' || containsTerm(excerpt, terms)) return excerpt;

        var text = entry.text;
        var match = firstMatch(entry, terms);
        if (match === null) return excerpt;
        var at = match.at;
        var length = match.length;

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

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
})();
