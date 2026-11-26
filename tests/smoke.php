<?php

declare(strict_types=1);

// Builds the theme in two locales, with and without a base URL, then in a single locale, and checks the output.
// Usage: php tests/smoke.php

const LOCALES = ['en', 'fr'];
const SLUGS = ['introduction', 'writing-content', 'deployment'];
const FR_MARKER = 'Marqueur-francais-0451';
const AUTHOR_LINKS = "\n[doc](/getting-started/deployment/) [home](/) [asset](/assets/css/app.css)\n";
const THEME_LINKS = '.nav-logo, .sidebar-link, .pagination-link, .error-link-primary, .error-link-secondary';

main();

function main(): void
{
    $root = dirname(__DIR__);
    $work = sys_get_temp_dir() . '/leaf-smoke-' . bin2hex(random_bytes(4));
    $failures = [];
    $pages = 0;
    $links = 0;
    $refusal = null;

    try {
        foreach (['', '/docs'] as $base) {
            $project = "$work/" . ($base === '' ? 'root' : 'docs');
            stageProject($root, $project, $base);
            $build = runBuild($project);
            if ($build !== null) {
                $failures[] = "[base '$base'] $build";
                continue;
            }
            $report = new Report($base, $failures);
            checkBuild($report, $project . '/dist', $project . '/content/getting-started/writing-content.md');
            $pages += $report->pages;
            $links += $report->links;
        }

        $project = "$work/single";
        stageSingleLocaleProject($root, $project);
        $build = runBuild($project);
        if ($build === null && !is_file($project . '/dist/404.html')) {
            $build = '404.html is missing';
        }
        if ($build !== null) {
            $failures[] = "[single locale] $build";
        } else {
            foreach (untranslatedKeys($project . '/dist') as $message) {
                $failures[] = "[single locale] $message";
            }
        }
    } catch (RuntimeException $e) {
        $refusal = $e->getMessage();
    } finally {
        removeTree($work);
    }

    if ($refusal !== null) {
        fwrite(STDERR, "smoke: $refusal\n");
        exit(2);
    }

    if ($failures !== []) {
        echo implode("\n", $failures) . "\n";
        exit(1);
    }
    echo "OK: $pages pages, $links links, 3 builds\n";
}

final class Report
{
    public int $pages = 0;
    public int $links = 0;

    /** @param list<string> $failures */
    public function __construct(public readonly string $base, private array &$failures)
    {
    }

    public function fail(string $page, string $message): void
    {
        $this->failures[] = "[base '{$this->base}'] $page: $message";
    }
}

function stageProject(string $root, string $project, string $base): void
{
    mkdir($project, 0777, true);
    foreach (['app', 'bin', 'content', 'locale', 'public'] as $dir) {
        copyTree("$root/$dir", "$project/$dir");
    }
    copy("$root/composer.json", "$project/composer.json");
    symlink("$root/vendor", "$project/vendor");

    $config = (string) file_get_contents("$root/config.yml");
    $config = preg_replace('/^(\s*supported_locales:\s*\n)(\s*- "en"\n)/m', "\$1\$2    - \"fr\"\n", $config, 1, $count);
    $config = preg_replace('/^(\s*base_url:).*$/m', '$1 "' . $base . '"', (string) $config);
    if ($count !== 1) {
        throw new RuntimeException('could not set supported_locales in config.yml');
    }
    file_put_contents("$project/config.yml", $config);

    mkdir("$project/content/fr/getting-started", 0777, true);
    file_put_contents(
        "$project/content/fr/getting-started/introduction.md",
        "---\ntitle: Introduction\norder: 1\n---\n\n# Introduction\n\n" . FR_MARKER . "\n" . AUTHOR_LINKS
    );
    file_put_contents("$project/content/getting-started/writing-content.md", AUTHOR_LINKS, FILE_APPEND);
}

function stageSingleLocaleProject(string $root, string $project): void
{
    mkdir($project, 0777, true);
    foreach (['app', 'bin', 'content', 'locale', 'public'] as $dir) {
        copyTree("$root/$dir", "$project/$dir");
    }
    copy("$root/composer.json", "$project/composer.json");
    symlink("$root/vendor", "$project/vendor");

    $config = preg_replace('/^localization:\n(?:[ \t]+.*\n|\n)*/m', '', (string) file_get_contents("$root/config.yml"), 1, $count);
    if ($count !== 1) {
        throw new RuntimeException('could not remove the localization section from config.yml');
    }
    file_put_contents("$project/config.yml", $config);
}

/** @return list<string> */
function untranslatedKeys(string $dist): array
{
    $found = [];
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dist, FilesystemIterator::SKIP_DOTS));
    foreach ($files as $file) {
        if ($file->getExtension() !== 'html') {
            continue;
        }
        $html = (string) file_get_contents($file->getPathname());
        foreach (['search.placeholder', 'not_found.title', 'toc.title'] as $key) {
            if (str_contains($html, $key)) {
                $found[] = substr($file->getPathname(), strlen($dist) + 1) . ": the theme key \"$key\" is rendered instead of its text";
            }
        }
    }

    return $found;
}

function runBuild(string $project): ?string
{
    $output = [];
    exec('cd ' . escapeshellarg($project) . ' && php bin/build.php 2>&1', $output, $code);

    return $code === 0 ? null : "build failed (exit $code): " . trim(implode(' | ', array_slice($output, -3)));
}

function checkBuild(Report $report, string $dist, string $englishSource): void
{
    $base = $report->base;
    $pages = distPages($dist);
    checkExpectedFiles($report, $dist);

    foreach ($pages as $path => $dom) {
        $report->pages++;
        $isFr = str_starts_with($path, 'fr/');
        $xpath = new DOMXPath($dom);
        checkLinkResolution($report, $path, $xpath, $dist, $base, '//a | //link | //script | //img');
        checkHtmlLang($report, $path, $xpath, $isFr ? 'fr' : 'en');
        checkThemeElements($report, $path, $dom);
        checkThemeLinks($report, $path, $dom, $base, $isFr);
        checkLanguageSwitcher($report, $path, $dom, $base, $isFr ? 'fr' : 'en');
    }

    checkContent($report, $pages, $dist, $englishSource);
    checkAuthorLinks($report, $pages);
}

/** Root-relative doc links and the home link in Markdown keep the page locale, assets never get one. */
/** @param array<string, DOMDocument> $pages */
function checkAuthorLinks(Report $report, array $pages): void
{
    $base = $report->base;
    $expected = [
        'getting-started/writing-content/index.html' => ["$base/getting-started/deployment/", "$base/"],
        'fr/getting-started/writing-content/index.html' => ["$base/fr/getting-started/deployment/", "$base/fr/"],
        'fr/getting-started/introduction/index.html' => ["$base/fr/getting-started/deployment/", "$base/fr/"],
    ];
    foreach ($expected as $page => [$doc, $home]) {
        if (!isset($pages[$page])) {
            continue;
        }
        $hrefs = array_map(
            fn (DOMNode $a): string => $a instanceof DOMElement ? $a->getAttribute('href') : '',
            iterator_to_array((new DOMXPath($pages[$page]))->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' prose ')]//a") ?: [], false),
        );
        foreach ([$doc, $home, "$base/assets/css/app.css"] as $url) {
            if (!in_array($url, $hrefs, true)) {
                $report->fail($page, "Markdown link $url is missing or rewritten (found: " . implode(' ', $hrefs) . ')');
            }
        }
    }
}

/** @return array<string, DOMDocument> */
function distPages(string $dist): array
{
    $pages = [];
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dist, FilesystemIterator::SKIP_DOTS));
    foreach ($files as $file) {
        if ($file->getExtension() !== 'html') {
            continue;
        }
        $dom = new DOMDocument();
        @$dom->loadHTML((string) file_get_contents($file->getPathname()), LIBXML_NOERROR | LIBXML_NOWARNING);
        $pages[substr($file->getPathname(), strlen($dist) + 1)] = $dom;
    }
    ksort($pages);

    return $pages;
}

function checkExpectedFiles(Report $report, string $dist): void
{
    $expected = ['index.html', 'fr/index.html', '404.html', 'fr/404.html', 'search.json', 'fr/search.json'];
    foreach (SLUGS as $slug) {
        $expected[] = "getting-started/$slug/index.html";
        $expected[] = "fr/getting-started/$slug/index.html";
    }
    foreach ($expected as $file) {
        if (!is_file("$dist/$file")) {
            $report->fail($file, 'expected file is missing');
        }
    }
}

/** Every root-relative href/src must stay under the base and point at a file in dist. */
function checkLinkResolution(Report $report, string $page, DOMXPath $xpath, string $dist, string $base, string $query): void
{
    foreach (rootRelativeUrls($xpath, $query) as $url) {
        $report->links++;
        $problem = resolutionProblem($url, $dist, $base);
        if ($problem !== null) {
            $report->fail($page, "$url $problem");
        }
    }
}

/** @return list<string> */
function rootRelativeUrls(DOMXPath $xpath, string $query): array
{
    $urls = [];
    foreach ($xpath->query($query) ?: [] as $node) {
        foreach (['href', 'src'] as $attribute) {
            $value = $node->getAttribute($attribute);
            if (str_starts_with($value, '/')) {
                $urls[] = $value;
            }
        }
    }

    return $urls;
}

function resolutionProblem(string $url, string $dist, string $base): ?string
{
    if (str_starts_with($url, '//')) {
        return 'is protocol-relative';
    }
    if ($url !== $base && !str_starts_with($url, "$base/")) {
        return "does not start with '$base/'";
    }
    $path = strtok(substr($url, strlen($base)), '?#');
    $path = ltrim((string) $path, '/');
    $file = ($path === '' || str_ends_with($path, '/')) ? $path . 'index.html' : $path;

    return is_file("$dist/$file") ? null : 'does not resolve to a file in dist';
}

function checkHtmlLang(Report $report, string $page, DOMXPath $xpath, string $expected): void
{
    $lang = $xpath->query('/html')?->item(0)?->getAttribute('lang');
    if ($lang !== $expected) {
        $report->fail($page, "<html lang> is '$lang', expected '$expected'");
    }
}

/** Every page must render the theme elements its layout requires. */
function checkThemeElements(Report $report, string $page, DOMDocument $dom): void
{
    $required = ['.nav-logo'];
    if (preg_match('#^(fr/)?getting-started/#', $page) === 1) {
        $required[] = '.sidebar-link';
        $required[] = '.pagination-link';
    }
    if (in_array($page, ['404.html', 'fr/404.html'], true)) {
        $required[] = '.error-link-primary';
        $required[] = '.error-link-secondary';
    }
    foreach ($required as $selector) {
        if (cssQuery($dom, $selector) === []) {
            $report->fail($page, "missing $selector");
        }
    }
}

function checkThemeLinks(Report $report, string $page, DOMDocument $dom, string $base, bool $isFr): void
{
    foreach (cssQuery($dom, THEME_LINKS) as $node) {
        $href = $node->getAttribute('href');
        $inFr = str_starts_with($href, "$base/fr/") || $href === "$base/fr";
        if ($isFr && !$inFr) {
            $report->fail($page, "theme link $href should start with '$base/fr/'");
        } elseif (!$isFr && $inFr) {
            $report->fail($page, "theme link $href should not start with '$base/fr/'");
        }
    }
}

function checkLanguageSwitcher(Report $report, string $page, DOMDocument $dom, string $base, string $current): void
{
    $targets = ['en' => "$base/", 'fr' => "$base/fr/"];
    $active = [];
    foreach (cssQuery($dom, '.lang-switcher-option') as $node) {
        $locale = $node->getAttribute('data-locale');
        if (($targets[$locale] ?? null) !== $node->getAttribute('href')) {
            $report->fail($page, "language option '$locale' links to '" . $node->getAttribute('href') . "'");
        }
        if (in_array('is-active', explode(' ', $node->getAttribute('class')), true)) {
            $active[] = $locale;
        }
    }
    if ($active !== [$current]) {
        $report->fail($page, 'active language options are [' . implode(',', $active) . "], expected [$current]");
    }
}

/** @param array<string, DOMDocument> $pages */
function checkContent(Report $report, array $pages, string $dist, string $englishSource): void
{
    $translated = $pages['fr/getting-started/introduction/index.html'] ?? null;
    if ($translated !== null && !str_contains((string) $translated->textContent, FR_MARKER)) {
        $report->fail('fr/getting-started/introduction/index.html', 'translated page lacks its marker');
    }

    preg_match('/^# (.+)$/m', (string) file_get_contents($englishSource), $heading);
    $fallback = $pages['fr/getting-started/writing-content/index.html'] ?? null;
    if ($fallback !== null && !str_contains((string) $fallback->textContent, $heading[1] ?? "\0")) {
        $report->fail('fr/getting-started/writing-content/index.html', 'fallback page lacks the English text');
    }

    if (is_file("$dist/fr/search.json") && !str_contains((string) file_get_contents("$dist/fr/search.json"), FR_MARKER)) {
        $report->fail('fr/search.json', 'does not contain the French marker');
    }
}

/** @return list<DOMElement> */
function cssQuery(DOMDocument $dom, string $selectors): array
{
    $xpath = new DOMXPath($dom);
    $parts = [];
    foreach (explode(',', $selectors) as $selector) {
        $class = ltrim(trim($selector), '.');
        $parts[] = "//*[contains(concat(' ', normalize-space(@class), ' '), ' $class ')]";
    }
    $nodes = [];
    foreach ($xpath->query(implode(' | ', $parts)) ?: [] as $node) {
        $nodes[] = $node;
    }

    return $nodes;
}

function copyTree(string $from, string $to): void
{
    mkdir($to, 0777, true);
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($from, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($items as $item) {
        $target = $to . '/' . $items->getSubPathname();
        $item->isDir() ? mkdir($target, 0777, true) : copy($item->getPathname(), $target);
    }
}

function removeTree(string $path): void
{
    if (is_link($path) || is_file($path)) {
        unlink($path);
        return;
    }
    if (!is_dir($path)) {
        return;
    }
    foreach (scandir($path) ?: [] as $entry) {
        if ($entry !== '.' && $entry !== '..') {
            removeTree("$path/$entry");
        }
    }
    rmdir($path);
}
