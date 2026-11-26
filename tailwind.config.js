/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./app/Views/**/*.latte', './public/assets/js/**/*.js'],
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
