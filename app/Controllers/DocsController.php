<?php

declare(strict_types=1);

namespace App\Controllers;

use Leaf\Config\LeafConfig;
use Leaf\Content\ContentLoader;
use Leaf\Content\SearchIndexBuilder;
use Zephyrus\Controller\Controller;
use Zephyrus\Http\Response;
use Zephyrus\Rendering\RenderResponses;
use Zephyrus\Routing\Attribute\Get;

final class DocsController extends Controller
{
    use RenderResponses;

    public function __construct(
        private readonly ContentLoader $contentLoader,
        private readonly SearchIndexBuilder $searchIndexBuilder,
        private readonly LeafConfig $leafConfig,
        private readonly string $defaultLocale = '',
        /** @var list<string> */
        private readonly array $supportedLocales = [],
    ) {
    }

    #[Get('/')]
    public function index(): Response
    {
        // Render the landing template. Projects customize it via
        // templates/landing.latte (binary tier) or app/Views/landing.latte
        // (Composer tier). The template ships a generic welcome landing
        // as a fallback.
        return $this->render('landing', [
            'title' => $this->leafConfig->name,
            'firstPage' => $this->contentLoader->getAllPages()[0] ?? null,
        ]);
    }

    #[Get('/{section}/{slug}')]
    public function show(string $section, string $slug): Response
    {
        $page = $this->contentLoader->getPage($section, $slug);

        if ($page === null) {
            return $this->render('404', [
                'title' => 'Page Not Found',
                'firstPage' => $this->contentLoader->getAllPages()[0] ?? null,
            ], 404);
        }

        $description = $page->meta('description', '');
        if ($description === '') {
            $plaintext = strip_tags($page->html);
            $plaintext = preg_replace('/\s+/', ' ', trim($plaintext));
            $description = mb_strlen($plaintext) > 160
                ? mb_substr($plaintext, 0, 157) . '...'
                : $plaintext;
        }

        return $this->render('docs/page', [
            'title' => $page->meta('title', ucfirst(str_replace('-', ' ', $slug))),
            'pageDescription' => $description,
            'section' => $section,
            'slug' => $slug,
            'content' => $this->prefixInternalLinks($page->html),
            'sidebar' => $this->contentLoader->getSidebar(),
            'toc' => $page->toc,
            'prevPage' => $this->contentLoader->getPreviousPage($section, $slug),
            'nextPage' => $this->contentLoader->getNextPage($section, $slug),
        ]);
    }

    #[Get('/search.json')]
    public function searchIndex(): Response
    {
        $index = $this->searchIndexBuilder->build();
        return Response::json($index);
    }

    /**
     * Prefix internal links and asset sources with the base URL, and doc links with the current locale.
     */
    private function prefixInternalLinks(string $html): string
    {
        $baseUrl = rtrim($this->leafConfig->baseUrl, '/');
        $locale = $this->contentLoader->getCurrentLocale();
        $localePrefix = $this->usesLocalePrefix($locale) ? '/' . $locale : '';
        $docPaths = $localePrefix === '' ? [] : $this->docPaths();

        return preg_replace_callback(
            '#\b(href|src)="(/(?!/)[^"]*)"#',
            function (array $m) use ($baseUrl, $localePrefix, $docPaths): string {
                $url = $m[2];
                if ($m[1] === 'href' && $localePrefix !== '' && $this->isLocalizable($url, $docPaths)) {
                    $url = $localePrefix . $url;
                }
                return $m[1] . '="' . $baseUrl . $url . '"';
            },
            $html,
        ) ?? $html;
    }

    private function usesLocalePrefix(string $locale): bool
    {
        return $locale !== '' && $locale !== $this->defaultLocale && in_array($locale, $this->supportedLocales, true);
    }

    /** @return array<string, true> */
    private function docPaths(): array
    {
        $paths = [];
        foreach ($this->contentLoader->getAllPages() as $page) {
            $paths['/' . $page['section'] . '/' . $page['slug']] = true;
        }
        return $paths;
    }

    /** @param array<string, true> $docPaths */
    private function isLocalizable(string $url, array $docPaths): bool
    {
        $path = strtok($url, '?#');
        if ($path === '/') {
            return true;
        }
        $firstSegment = explode('/', $path, 3)[1] ?? '';
        return !in_array($firstSegment, $this->supportedLocales, true)
            && isset($docPaths[rtrim($path, '/')]);
    }

    #[Get('/404')]
    public function notFound(): Response
    {
        return $this->render('404', [
            'title' => 'Page Not Found',
            'firstPage' => $this->contentLoader->getAllPages()[0] ?? null,
        ]);
    }
}
