# Legacy backups

Created 2026-05-06 during the migration from static bundles to React routes.

## `static-bundles/`
Original pre-built static bundles that used to be served at `/origine`, `/podcast`, `/vata`
via Firebase rewrites. Replaced by full React pages under `src/pages/<name>/`.

## `old-stubs/`
The earlier minimal `OriginePage.tsx`, `PodcastPage.tsx`, `VataPage.tsx` placeholder
files that lived in `src/pages/`. They were never wired up and have been replaced by
the full source from the Downloads folder.

Both directories are excluded from the build (hidden `.legacy/` is outside `public/`
and `dist/`). Safe to delete once the new React pages are confirmed working.
