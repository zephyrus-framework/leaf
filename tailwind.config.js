/** @type {import('tailwindcss').Config} */
module.exports = {
    content: {
        files: ['./app/Views/**/*.latte', './content/**/*.md', './public/assets/js/**/*.js'],
        // Only the class attributes of a Markdown page: its prose would add a class for each word that names one.
        extract: {
            md: (markdown) => Array.from(
                markdown.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g),
                (match) => (match[1] ?? match[2] ?? match[3]).split(/\s+/),
            ).flat(),
        },
    },
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
