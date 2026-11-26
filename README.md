# Zephyrus Leaf

A static documentation site generator powered by [Zephyrus](https://github.com/zephyrus-framework/core). Write your docs in Markdown, develop with live-reload, and build to static HTML with a single command.

## Features

- **Markdown content** -- YAML frontmatter, GFM tables, fenced code blocks, heading permalinks
- **Automatic navigation** -- Sidebar and table of contents generated from your content structure
- **Full-text search** -- Client-side fuzzy search across all pages, no server required
- **Syntax highlighting** -- Prism.js with support for PHP, JavaScript, TypeScript, Bash, YAML, JSON, SQL, and Solidity
- **Light and dark themes** -- Follows the system preference, and the navbar button switches between them and remembers the choice
- **One-command build** -- `composer build` generates a `dist/` folder ready for GitHub Pages, Netlify, or any static host
- **Live-reload** -- Edit a file, see changes instantly during development
- **Mobile responsive** -- Hamburger menu with slide-in sidebar drawer on small screens

## Requirements

- PHP 8.4+
- Composer
- `ext-intl` and `ext-mbstring`

## Quick Start

```bash
# Clone or create a new project
composer create-project zephyrus-framework/leaf my-docs

cd my-docs

# Start the dev server with live-reload
composer dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Project Structure

```
my-docs/
├── config.yml              # Site identity, sections, and build settings
├── content/                # Markdown documentation pages
│   └── getting-started/
│       └── introduction.md
├── locale/                 # Interface labels, one folder per locale
├── app/
│   ├── Controllers/        # Route handlers
│   ├── Models/Core/        # Application bootstrap
│   └── Views/              # Latte templates
│       ├── docs/page.latte
│       ├── layouts/
│       └── partials/       # Nav, sidebar, footer, search, TOC
├── public/
│   ├── assets/
│   │   ├── css/app.css     # Full theme CSS
│   │   ├── css/tailwind.css # Compiled Tailwind classes (composer css or build)
│   │   └── js/             # Copy-code, sidebar, search scripts
│   └── index.php
├── resources/css/          # Tailwind input
├── tailwind.config.js      # Tailwind tokens and the files it scans
├── bin/
│   ├── router.php          # Dev server entry point
│   ├── build.php           # Static site builder
│   └── tailwind.sh         # Compiles css/tailwind.css
└── dist/                   # Built static output (after composer build)
```

## Writing Content

### Pages

Create Markdown files in `content/{section}/{page}.md`. Each file needs YAML frontmatter:

```yaml
---
title: Installation
order: 2
---

# Installation

Your content here...
```

The `title` appears in the sidebar. The `order` controls the sort order within a section (lower numbers come first).

### Sections

Define sections and their display names in `config.yml`:

```yaml
leaf:
  sections:
    getting-started: "Getting Started"
    guides: "Guides"
    api-reference: "API Reference"
```

The order in the YAML file determines the sidebar order. Create a matching directory under `content/` for each section.

### Cross-references

Link between pages using absolute paths:

```markdown
See the [Installation](/getting-started/installation/) guide.
```

## Configuration

All site settings live in the `leaf:` section of `config.yml`:

```yaml
leaf:
  name: "My Project"             # Displayed in the navbar
  version: "1.0.0"               # Version badge in the navbar
  description: "A short tagline" # Used in meta tags
  logo: ""                       # Header image under public/, e.g. "/assets/images/logo.svg" (empty keeps the default mark)
  github_url: ""                 # GitHub link in the navbar (leave empty to hide)
  content_path: "content"        # Where markdown files live
  sections:                      # Sidebar sections (order matters)
    getting-started: "Getting Started"
  output_path: "dist"            # Static build output directory
  base_url: ""                   # Base URL for production (e.g. "/docs")
  author: "Your Name"            # Displayed in the sidebar footer
  author_url: ""                 # Author link
  license: "MIT"                 # License badge in the footer
```

## Customization

### Logo

Put the image under `public/` and point `leaf.logo` at it in `config.yml`, with a path that starts with a single `/`:

```yaml
leaf:
  logo: "/assets/images/logo.svg"
```

The header shows it next to the site name, in place of the default mark, and prefixes it with `base_url`. When the header is too narrow for the whole name beside the logo, the name is hidden rather than cut, and screen readers still read it. An empty string keeps the default mark; any other value (a relative path, a full URL, `//`) stops the build with a message that says what is accepted.

### Custom Pages

A Latte template at `app/Views/pages/{name}.latte` is built to `/{name}/`. Give its `<main>` the id `main-content`, the target of the theme's "Skip to content" link, and a top padding taller than the fixed navigation bar (4rem), as `py-32` does here:

```latte
{layout '../layouts/landing.latte'}

{block content}
<main id="main-content" tabindex="-1" class="max-w-4xl mx-auto px-6 py-32">
    <h1 class="text-5xl font-bold text-bright leading-tight mb-6">About</h1>
    <p>A custom page.</p>
</main>
{/block}
```

Every class of this example is in the theme's compiled stylesheet. A class the theme does not use is compiled into it by `composer build` in a Composer project (by `composer css` alone, for `composer dev`), and needs the Tailwind CDN loaded from `templates/partials/head.latte` in a Binary project: see [Styling](#styling).

### Theme

The design system is defined as CSS custom properties in `public/assets/css/app.css`, dark by default and light when the system or the theme button picks it:

| Property | Dark | Light | Usage |
|---|---|---|---|
| `--bg-deep` | `#08080d` | `#ffffff` | Page background |
| `--bg-surface` | `#11111a` | `#f8f8fa` | Sidebar, cards, code blocks |
| `--bg-elevated` | `#1a1a27` | `#f0f0f4` | Hover states |
| `--border` | `#1e1e2e` | `#e4e4e8` | Borders and dividers |
| `--border-accent` | `rgba(139, 92, 246, 0.3)` | `rgba(139, 92, 246, 0.25)` | Border of a hovered control or card |
| `--accent` | `#8b5cf6` | `#7c3aed` | Primary accent (violet): borders, accent bars and `.text-accent` |
| `--accent-light` | `#a78bfa` | `#6d28d9` | Links, inline code, active and hovered items |
| `--accent-glow` | `rgba(139, 92, 246, 0.15)` | `rgba(139, 92, 246, 0.08)` | Tint of the active link, search matches and hovered cards |
| `--accent-fill` | `#7c3aed` | `#7c3aed` | Filled button background, under white text |
| `--accent-fill-hover` | `#6d28d9` | `#6d28d9` | Filled button hover |
| `--text` | `#d4d4d8` | `#3f3f46` | Body text |
| `--text-bright` | `#fafafa` | `#18181b` | Headings |
| `--text-muted` | `#8a8a94` | `#65656e` | Secondary text and labels |
| `--font-body` | Inter | Inter | Body font |
| `--font-mono` | JetBrains Mono | JetBrains Mono | Code font |

These properties are public: none is renamed or removed in 1.x. The rest of `app.css` is not (see [Versioning](#versioning)).

To change them, set them in a stylesheet of your own linked after `app.css` in `partials/head.latte`, under the three selectors `app.css` uses, which stay in 1.x. `:root` alone is not enough: in the light mode the system picks, `app.css` sets them again with a more specific selector.

```css
:root {
    --accent: #38bdf8;
    --accent-light: #7dd3fc;
}
[data-theme="light"] {
    --accent: #0369a1;
    --accent-light: #0369a1;
}
@media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
        --accent: #0369a1;
        --accent-light: #0369a1;
    }
}
```

### Interface Text and Languages

The theme's labels (search, pagination, table of contents, 404 page) are read with `{localize('search.placeholder')}` from `locale/en/general.json`, and `locale/fr/general.json` carries their French translation. To publish a French version, add `fr` to `localization.supported_locales` in `config.yml` and put the translated pages under `content/fr/`. The site name, its description (`leaf.description`) and the section titles come from `config.yml` and are not translated per locale.

### Syntax Highlighting

Additional Prism.js languages can be added in `app/Views/layouts/docs.latte`:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-rust.min.js" integrity="sha512-R/HpMlNfZZV6DxMhNz1dYJbBaPBVSOCqX8imo3uGUurhPDHRcXrBxkEVOjawwUwTMfOqT6t1eLYYQXIjFWCX/A==" crossorigin="anonymous"></script>
```

## Styling

The theme ships its Tailwind CSS classes compiled, in `public/assets/css/tailwind.css` (Tailwind CSS 3.4.17), linked right after `app.css`. It holds the classes the theme's templates and scripts use, with the colour tokens (`deep`, `surface`, `elevated`, `border`, `border-accent`, `body`, `bright`, `muted`, `accent`, `accent-light`, `accent-fill`, `accent-fill-hover`, `accent-glow`) and the fonts (`font-body`, `font-mono`). No page loads Tailwind as a script.

A template or a Markdown page of your site that uses a class the sheet lacks:

- **Composer project**: `composer build` compiles the sheet again before it builds the pages, and `composer css` compiles it alone, for `composer dev`; commit `public/assets/css/tailwind.css`. Both compile it from `app/Views/**/*.latte`, the `class` attributes of `content/**/*.md` and `public/assets/js/**/*.js`, with the standalone Tailwind CSS CLI (no Node.js), downloaded once into `~/.cache/leaf` and checked against the SHA-256 pinned in `bin/tailwind.sh`. They need `sh`, `curl` or `wget`, and `sha256sum` or `shasum`. `composer css -- --watch` compiles again on every change.
- **Binary project**: the CLI ships the theme's sheet as it is. Load Tailwind in the browser from your `templates/partials/head.latte` (a copy of the theme's), after the stylesheet links, or link your own stylesheet from there:

```html
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
<script>
if (window.tailwind) {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    deep: 'var(--bg-deep)',
                    surface: 'var(--bg-surface)',
                    elevated: 'var(--bg-elevated)',
                    border: 'var(--border)',
                    'border-accent': 'var(--border-accent)',
                    body: 'var(--text)',
                    bright: 'var(--text-bright)',
                    muted: 'var(--text-muted)',
                    accent: 'var(--accent)',
                    'accent-light': 'var(--accent-light)',
                    'accent-fill': 'var(--accent-fill)',
                    'accent-fill-hover': 'var(--accent-fill-hover)',
                    'accent-glow': 'var(--accent-glow)',
                },
                fontFamily: {
                    body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
                },
            },
        },
    };
}
</script>
```

Under a Content Security Policy, the CDN needs more than the theme: see [Content Security Policy](#content-security-policy).

## Commands

```bash
composer dev     # Start dev server with live-reload (localhost:8080)
composer build   # Compile public/assets/css/tailwind.css, then generate static HTML to dist/
composer css     # Compile public/assets/css/tailwind.css again from the templates, Markdown pages and scripts
```

## Deployment

After running `composer build`, which compiles `public/assets/css/tailwind.css` before the pages (see [Styling](#styling)), the `dist/` directory contains a fully self-contained static site. Deploy it to any static hosting:

**GitHub Pages** -- Push `dist/` to a `gh-pages` branch or configure GitHub Pages to serve from `dist/` on `main`.

**Netlify / Vercel** -- Point the build output directory to `dist/`.

**Manual** -- Upload the contents of `dist/` to any web server.

The build also generates a `404.html` at the root of `dist/`, and one per additional locale (`dist/fr/404.html`). GitHub Pages only ever serves the root one, so on a multilingual site its script sends a missing `/fr/...` address to `fr/404.html`; hosts that already serve the nearest `404.html` (the dev server, Cloudflare Pages) show the right language directly. Without JavaScript, the root page links to the other languages.

### Content Security Policy

The theme needs at least this policy:

```text
default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/ 'unsafe-inline'; style-src 'self' https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/ https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com
```

- `style-src` needs `'unsafe-inline'` for the `style` attributes of the templates and the `<style>` of the not found page.
- `script-src` needs `'unsafe-inline'` for the `onclick` handlers of `partials/nav.latte` and `partials/search-modal.latte`, and the inline script of the not found page on a multilingual site. To allow only these, replace it with `'unsafe-hashes'` and their hashes, which hold for the templates of this release (the browser console names the hash of a blocked inline script, not of a handler):

```text
script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/ 'unsafe-hashes' 'sha256-qH/H5E39wIxy0S0dzFOdTtjGoqGl2zkav3ST5Jahe+Y=' 'sha256-JjHiWisXH6Ri6LHUyipLkvh/qsN//uXo8HDK+o78PHo=' 'sha256-XPTVMpepMRbT3oZt5JJuOgTZEmuNp8ph4q/Ei2iDyK8=' 'sha256-PQDXQfWwRsMDHBmPS8erPYcl65nOrE320RM44JUyGlM=' 'sha256-Q34AdLvljDiSU3tE54gArDSbcMkJP29VHFSJA+TLiBg='
```

Loading Tailwind from its CDN (see [Styling](#styling)) adds `https://cdn.tailwindcss.com` to `script-src`, with its inline configuration script, which `'unsafe-inline'` already allows (with the hashes above, add its own hash, which the console names). The `'unsafe-inline'` of `style-src` already covers the styles it injects.

## Versioning

Leaf follows semantic versioning since 1.0.0: nothing breaks before 2.0. The full policy is on [Versioning and stability](https://leaf.ophelios.com/getting-started/versioning/), and each release is in [CHANGELOG.md](CHANGELOG.md).

- **Public**: the configuration, the names of the templates Leaf renders and the variables each one receives.
- **Not public**: the markup inside the theme's templates, the classes of `app.css` and the theme's JavaScript. A template you override belongs to your site; the changelog names each template, stylesheet or script a release changes and what an override must take over.
- **Styling**: the theme stays on Tailwind CSS 3 for all of 1.x, its compiled stylesheet never loses a class, its colour and font tokens stay, and so do the CSS properties listed in [Theme](#theme). For a class it lacks, see [Styling](#styling).

## License

MIT
