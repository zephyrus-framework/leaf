#!/bin/sh
# Compiles public/assets/css/tailwind.css from the templates and scripts, with the standalone
# Tailwind CSS CLI downloaded once into the user cache and checked against the SHA-256 pinned below.
# Usage: sh bin/tailwind.sh [tailwindcss options, such as --watch]
# TAILWIND_BIN: a binary to run instead of the download; it must be one of the pinned binaries.
set -eu

version=3.4.17
# One line per release asset: its name, then its SHA-256.
pinned='tailwindcss-linux-x64 7d24f7fa191d2193b78cd5f5a42a6093e14409521908529f42d80b11fde1f1d4
tailwindcss-linux-arm64 69b1378b8133192d7d2feb12a116fa12d035594f58db3eff215879e4ad8cf39b
tailwindcss-macos-x64 6cbdad74be776c087ffa5e9a057512c54898f9fe8828d3362212dfe32fc933a3
tailwindcss-macos-arm64 a1d0c7985759accca0bf12e51ac1dcbf0f6cf2fffb62e6e0f62d091c477a10a3
tailwindcss-windows-x64.exe 67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346'

fail() {
    echo "tailwind: $1" >&2
    exit 1
}

# The pinned SHA-256 of an asset; fails for an asset that has none.
pinned_sum() {
    printf '%s\n' "$pinned" | awk -v asset="$1" '$1 == asset { print $2; found = 1 } END { exit !found }'
}

# Succeeds when the SHA-256 is the one of a pinned asset.
is_pinned_sum() {
    printf '%s\n' "$pinned" | awk -v sum="$1" '$2 == sum { found = 1 } END { exit !found }'
}

platform_asset() {
    case $(uname -s) in
        Linux) os=linux ;;
        Darwin) os=macos ;;
        MINGW* | MSYS* | CYGWIN*) os=windows ;;
        *) return 1 ;;
    esac
    case $(uname -m) in
        x86_64 | amd64) arch=x64 ;;
        aarch64 | arm64) arch=arm64 ;;
        *) return 1 ;;
    esac
    suffix=
    if [ "$os" = windows ]; then
        suffix=.exe
    fi
    echo "tailwindcss-$os-$arch$suffix"
}

if command -v sha256sum > /dev/null 2>&1; then
    sha256_of() { sha256sum "$1" | cut -d ' ' -f 1; }
elif command -v shasum > /dev/null 2>&1; then
    sha256_of() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
else
    fail 'needs sha256sum or shasum to check the Tailwind CSS binary'
fi

download() {
    if command -v curl > /dev/null 2>&1; then
        curl -fsSL --proto '=https' --tlsv1.2 -o "$2" "$1"
    elif command -v wget > /dev/null 2>&1; then
        wget -q --https-only -O "$2" "$1"
    else
        fail 'needs curl or wget to download the Tailwind CSS binary'
    fi
}

if [ -n "${TAILWIND_BIN:-}" ]; then
    bin=$TAILWIND_BIN
    [ -f "$bin" ] || fail "TAILWIND_BIN ($bin) is not a file"
    sum=$(sha256_of "$bin")
    is_pinned_sum "$sum" || fail "TAILWIND_BIN ($bin) is not one of the Tailwind CSS $version binaries pinned in bin/tailwind.sh (its SHA-256 is $sum)"
    case $bin in
        /*) ;;
        *) bin=$(pwd)/$bin ;;
    esac
else
    asset=$(platform_asset) || fail "Tailwind CSS $version has no pinned binary for $(uname -s) $(uname -m)"
    expected=$(pinned_sum "$asset") || fail "Tailwind CSS $version has no pinned binary for $(uname -s) $(uname -m)"
    cache=${XDG_CACHE_HOME:-$HOME/.cache}/leaf
    bin=$cache/$asset-$version
    if [ ! -f "$bin" ] || [ "$(sha256_of "$bin")" != "$expected" ]; then
        mkdir -p "$cache"
        partial=$bin.$$.part
        echo "tailwind: downloading Tailwind CSS $version ($asset) into $cache" >&2
        download "https://github.com/tailwindlabs/tailwindcss/releases/download/v$version/$asset" "$partial" || {
            rm -f "$partial"
            fail "could not download $asset"
        }
        actual=$(sha256_of "$partial")
        if [ "$actual" != "$expected" ]; then
            rm -f "$partial"
            fail "the downloaded $asset has SHA-256 $actual instead of $expected; it was deleted"
        fi
        chmod +x "$partial"
        mv -f "$partial" "$bin"
    fi
fi

cd "$(dirname "$0")/.."
export BROWSERSLIST_IGNORE_OLD_DATA=1
exec "$bin" --config tailwind.config.js --input resources/css/tailwind.css --output public/assets/css/tailwind.css --minify "$@"
