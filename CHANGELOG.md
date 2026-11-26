# Changelog

Notable changes to the Leaf theme and project template. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [semantic versioning](https://semver.org/).

## [1.0.0] - Unreleased

First stable release: nothing breaks before 2.0. What is public, and what is not, is on [Versioning and stability](https://leaf.ophelios.com/getting-started/versioning/).

### Upgrading a Composer project

In `composer.json`, require `"zephyrus-framework/leaf-core": "^1.0"` (in place of `@dev` or `^0.1`) and remove `"minimum-stability": "dev"` if it is there, then run `composer update`.

Your project has its own copy of the theme, which keeps loading Tailwind from its CDN until you take over the compiled stylesheet: copy `bin/tailwind.sh`, `tailwind.config.js`, `resources/css/tailwind.css` and `public/assets/css/tailwind.css` from this release, add `"css": "sh bin/tailwind.sh"` to the `scripts` of `composer.json`, change `partials/head.latte` as below, then run `composer css`.

### Added

- The search button and dialog on the landing layout, so the home page, custom pages and the not found page can search too.

### Changed

- The theme no longer loads Tailwind CSS from its CDN. It ships `public/assets/css/tailwind.css`, compiled with Tailwind CSS 3.4.17 from its templates and scripts with the same colour and font tokens: pages look the same, and no Tailwind script runs. Its classes never go away in 1.x. A template of your site that uses a class the sheet lacks loses that style: run `composer css` in a Composer project, or load the CDN from `templates/partials/head.latte` in a Binary one (see Styling in the README).

### Fixed

- A short landing page keeps its footer at the bottom of the window.
- Beside a logo, a site name that does not fit is hidden instead of cut, and screen readers still read it. A wide logo scales down instead of being squeezed.
- The landing hero glow fades out instead of ending on a hard edge.
- In the search dialog, the first result is preselected, so Enter opens it.
- In the search dialog, an accent bar marks the selected result, which its tint alone did not set apart from the others.
- The search field is an ARIA combobox and its results a listbox, so screen readers announce the selected result. The focus stays in the field: Tab no longer stops on the results.
- In the search dialog, the pointer moves the selection to the result it hovers, so one result only is highlighted at a time.
- A query typed before the search index has arrived runs as soon as it does, instead of finding nothing.
- Search ranks pages carrying every term first, and whole words above parts of words.

### What an override must take over

A template, stylesheet or script your site overrides belongs to your site. Take over these changes in yours (templates live under `app/Views/` in a Composer project, `templates/` in a Binary one):

- `partials/head.latte`: in place of the `cdn.tailwindcss.com` script and the inline `tailwind.config` script after it, `<link rel="stylesheet" href="{$leafBaseUrl}/assets/css/tailwind.css">` right after the `app.css` link (after it, so that its rules still win over `app.css` as the CDN's did). An override that keeps the CDN keeps working.
- `partials/nav.latte`: `{default bool $showSearch = $docsMode}` at the top, `{if $showSearch}` around the search button; keep the `<span>` of the site name right after the logo `<img class="nav-logo-img">`, which the stylesheet targets.
- `layouts/landing.latte`: `class="landing-layout"` on `<body>`, a `<div class="landing-content">` around `{block content}{/block}`, `showSearch: true` on the nav include, then `{include '../partials/search-modal.latte'}` and the `search.js` script.
- `public/assets/css/app.css`: `object-fit` and `object-position` on `.nav-logo-img`, the `.nav-logo:has(> .nav-logo-img)` and `.nav-logo-img + span` rules, the `.landing-layout` and `.landing-content` rules, the new `.hero-glow`, `position: relative` on `.search-result-item` with the new `.search-result-item.active::before`, and `.search-result-item:hover` taken out of the rule that highlights `.search-result-item.active`.
- `public/assets/js/search.js`: `search()` and `occurrences()`; for the combobox, the four attributes set on the field after the elements are looked up, `renderEmpty()`, `renderMessage()`, `renderResults()` (with the `id`, `role` and `tabindex` of each result), the new `setExpanded()`, `updateActiveItem()` and the selector of `keepTabInDialog()`; the new `mousemove` listener on the results, which moves the selection; `runQuery()`, the input listener now named, and the `.then()` that ends `loadIndex()`.

## Earlier versions

The 0.1.x releases are described on [GitHub](https://github.com/zephyrus-framework/leaf/releases).
