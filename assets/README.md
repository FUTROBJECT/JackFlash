# App store icon & splash sources

Source assets for `@capacitor/assets`. The `npx capacitor-assets generate` step
(see `docs/LAUNCH-native-setup.md`) reads the **PNG** files here and writes the
per-platform icons/splashes into `ios/` and `android/`.

| File | Size | Role |
|---|---|---|
| `icon-only.png` | 1024² | iOS app icon + fallback (bolt on cream) |
| `icon-foreground.png` | 1024² | Android adaptive **foreground** (bolt, transparent, safe-zone padded) |
| `icon-background.png` | 1024² | Android adaptive **background** (solid cream) |
| `splash.png` | 2732² | Launch splash, light (bolt on cream) |
| `splash-dark.png` | 2732² | Launch splash, dark (bolt on ink `#1A1A1A`) |

## The `.svg` files are the source of truth

Each PNG is rasterized from the matching `.svg`. To restyle the mark, edit the
SVGs (they share the brand bolt from `public/icon.svg`) and regenerate the PNGs.

The SVGs were composed by `scripts`-free generation from `public/icon.svg`'s bolt
paths (cream `#FFFBEB`, yellow `#fbca52`, teal `#b9dddc`, ink `#1A1A1A`). To
re-rasterize on a Mac without an SVG tool installed, Quick Look works:

```
# icons at 1024
for n in icon-only icon-foreground icon-background; do
  qlmanage -t -s 1024 -o . "$n.svg" && mv "$n.svg.png" "$n.png"
  sips -z 1024 1024 "$n.png"
done
# splashes: render at 1366 then upscale (flat art, upscales cleanly)
for n in splash splash-dark; do
  qlmanage -t -s 1366 -o . "$n.svg" && mv "$n.svg.png" "$n.png"
  sips -z 2732 2732 "$n.png"
done
```

`icon-foreground.png` must keep its transparent background (it's the adaptive
foreground layer). `icon-only` and both splashes are opaque.
