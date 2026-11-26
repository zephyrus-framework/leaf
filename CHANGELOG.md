# Changelog

Notable changes to the Leaf theme and project template. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [semantic versioning](https://semver.org/).

## [1.0.0] - Unreleased

First stable release: nothing breaks before 2.0. What is public, and what is not, is on [Versioning and stability](https://leaf.ophelios.com/getting-started/versioning/).

### Upgrading a Composer project

In `composer.json`, require `"zephyrus-framework/leaf-core": "^1.0"` (in place of `@dev` or `^0.1`) and remove `"minimum-stability": "dev"` if it is there, then run `composer update`.

### Added

- The search button and dialog on the landing layout, so the home page, custom pages and the not found page can search too.

### Fixed

- A short landing page keeps its footer at the bottom of the window.
- Beside a logo, a site name that does not fit is hidden instead of cut, and screen readers still read it. A wide logo scales down instead of being squeezed.
- The landing hero glow fades out instead of ending on a hard edge.
- In the search dialog, the first result is preselected, so Enter opens it.
- Search ranks pages carrying every term first, and whole words above parts of words.

### What an override must take over

A template, stylesheet or script your site overrides belongs to your site. Take over these changes in yours (templates live under `app/Views/` in a Composer project, `templates/` in a Binary one):

- `partials/nav.latte`: `{default bool $showSearch = $docsMode}` at the top, `{if $showSearch}` around the search button; keep the `<span>` of the site name right after the logo `<img class="nav-logo-img">`, which the stylesheet targets.
- `layouts/landing.latte`: `class="landing-layout"` on `<body>`, a `<div class="landing-content">` around `{block content}{/block}`, `showSearch: true` on the nav include, then `{include '../partials/search-modal.latte'}` and the `search.js` script.
- `public/assets/css/app.css`: `object-fit` and `object-position` on `.nav-logo-img`, the `.nav-logo:has(> .nav-logo-img)` and `.nav-logo-img + span` rules, the `.landing-layout` and `.landing-content` rules, and the new `.hero-glow`.
- `public/assets/js/search.js`: `search()` and `occurrences()`, and the two lines that end `renderResults()` to preselect the first result.

## Earlier versions

The 0.1.x releases are described on [GitHub](https://github.com/zephyrus-framework/leaf/releases).
