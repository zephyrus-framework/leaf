/**
 * A table frame that scrolls sideways becomes a named region in the tab order, so a keyboard can scroll it.
 * A frame whose table fits stays out of the tab order. Checked on load and whenever the frame or its table resizes.
 */
(function () {
    'use strict';

    var script = document.currentScript;
    var label = (script && script.getAttribute('data-label')) || 'Scrollable table';
    var captionLabel = (script && script.getAttribute('data-label-caption')) || 'Scrollable table: {caption}';
    var frames = document.querySelectorAll('.table-scroll');

    if (frames.length === 0 || !('ResizeObserver' in window)) return;

    function update(frame) {
        if (frame.scrollWidth > frame.clientWidth) {
            frame.setAttribute('tabindex', '0');
            frame.setAttribute('role', 'region');
            frame.setAttribute('aria-label', name(frame));
        } else {
            frame.removeAttribute('tabindex');
            frame.removeAttribute('role');
            frame.removeAttribute('aria-label');
        }
    }

    function name(frame) {
        var caption = frame.querySelector(':scope > table > caption');
        var text = caption ? caption.textContent.replace(/\s+/g, ' ').trim() : '';
        return text === '' ? label : captionLabel.replace('{caption}', function () { return text; });
    }

    var observer = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) { update(entry.target.closest('.table-scroll')); });
    });
    frames.forEach(function (frame) {
        observer.observe(frame);
        var table = frame.querySelector('table');
        if (table) observer.observe(table);
    });
})();
