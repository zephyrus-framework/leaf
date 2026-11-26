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
│   │   └── js/             # Copy-code, sidebar, search scripts
│   └── index.php
├── bin/
│   ├── router.php          # Dev server entry point
│   └── build.php           # Static site builder
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

A Latte template at `app/Views/pages/{name}.latte` is built to `/{name}/`. Give its `<main>` the id `main-content`, the target of the theme's "Skip to content" link:

```latte
{layout '../layouts/landing.latte'}

{block content}
<main id="main-content" tabindex="-1" class="max-w-3xl mx-auto px-6 pt-28 pb-16">
    <h1 class="text-3xl font-bold text-bright">About</h1>
    <p>A custom page.</p>
</main>
{/block}
```

### Theme

The design system is defined as CSS custom properties in `public/assets/css/app.css`:

| Token | Default | Usage |
|---|---|---|
| `--bg-deep` | `#08080d` | Page background |
| `--bg-surface` | `#11111a` | Sidebar, cards, code blocks |
| `--bg-elevated` | `#1a1a27` | Hover states |
| `--accent` | `#8b5cf6` | Primary accent (violet) |
| `--accent-light` | `#a78bfa` | Hover accent |
| `--accent-fill` | `#7c3aed` | Filled button background, under white text |
| `--accent-fill-hover` | `#6d28d9` | Filled button hover |
| `--text` | `#d4d4d8` | Body text |
| `--text-bright` | `#fafafa` | Headings |
| `--font-body` | Inter | Body font |
| `--font-mono` | JetBrains Mono | Code font |

### Interface Text and Languages

The theme's labels (search, pagination, table of contents, 404 page) are read with `{localize('search.placeholder')}` from `locale/en/general.json`, and `locale/fr/general.json` carries their French translation. To publish a French version, add `fr` to `localization.supported_locales` in `config.yml` and put the translated pages under `content/fr/`. The site name, its description (`leaf.description`) and the section titles come from `config.yml` and are not translated per locale.

### Syntax Highlighting

Additional Prism.js languages can be added in `app/Views/layouts/docs.latte`:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-rust.min.js"></script>
```

## Commands

```bash
composer dev     # Start dev server with live-reload (localhost:8080)
composer build   # Generate static HTML to dist/
```

## Deployment

After running `composer build`, the `dist/` directory contains a fully self-contained static site. Deploy it to any static hosting:

**GitHub Pages** -- Push `dist/` to a `gh-pages` branch or configure GitHub Pages to serve from `dist/` on `main`.

**Netlify / Vercel** -- Point the build output directory to `dist/`.

**Manual** -- Upload the contents of `dist/` to any web server.

The build also generates a `404.html` at the root of `dist/`, and one per additional locale (`dist/fr/404.html`). GitHub Pages only ever serves the root one, so on a multilingual site its script sends a missing `/fr/...` address to `fr/404.html`; hosts that already serve the nearest `404.html` (the dev server, Cloudflare Pages) show the right language directly. Without JavaScript, the root page links to the other languages.

## Versioning

Leaf follows semantic versioning since 1.0.0: nothing breaks before 2.0. The full policy is on [Versioning and stability](https://leaf.ophelios.com/getting-started/versioning/), and each release is in [CHANGELOG.md](CHANGELOG.md).

- **Public**: the configuration, the names of the templates Leaf renders and the variables each one receives.
- **Not public**: the markup inside the theme's templates, the classes of `app.css` and the theme's JavaScript. A template you override belongs to your site; the changelog names each template, stylesheet or script a release changes and what an override must take over.
- **Styling**: throughout 1.x the theme loads Tailwind CSS v3 in the browser with its colour and font tokens, so a template can use any Tailwind v3 utility class.

## License

MIT
