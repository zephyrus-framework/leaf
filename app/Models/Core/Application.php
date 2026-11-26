<?php

declare(strict_types=1);

namespace App\Models\Core;

use App\Controllers\DocsController;
use App\Controllers\PagesController;
use Leaf\Kernel;

final class Application extends Kernel
{
    protected function createController(string $class): object
    {
        if ($class === DocsController::class) {
            return new DocsController(
                $this->contentLoader,
                $this->searchIndexBuilder,
                $this->leafConfig,
                $this->config->localization->locale,
                array_values($this->config->localization->supportedLocales),
            );
        }
        if ($class === PagesController::class) {
            return new PagesController(
                $this->leafConfig,
            );
        }
        return new $class();
    }
}
