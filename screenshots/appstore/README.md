# App Store screenshots

Upload these in App Store Connect → the version page → Previews and Screenshots.

| Folder | Device slot | Size |
|---|---|---|
| `iphone-6.9/` | iPhone 6.9" | 1320 × 2868 |
| `iphone-6.3/` | iPhone 6.3" / 6.1" "medium display" slot (resized from 6.9") | 1206 × 2622 |
| `iphone-6.5/` | iPhone 6.5" (only if App Store Connect asks for it; resized from 6.9") | 1284 × 2778 |
| `ipad-13/` | iPad 13" (covers 12.9" too) | 2064 × 2752 |

Upload order = file order (01 → 06). Each folder only fits its own slot: "File dimensions are invalid" means the files went into the wrong one. Apple scales the 6.9" set down for smaller iPhones, so 6.9" alone is enough. Captions and rules: `JackFlash-Screenshot-Spec.md`; copy rules: `docs/voice-and-messaging.md`.

## Regenerating

1. Build the **store** app for the simulator (`npm run cap:sync`, then `xcodebuild … -sdk iphonesimulator`).
2. Seed demo data: `node demo-seed.mjs <repo> seed.json` (needs `OLIVE_TABLES='[6]' OLIVE_MODE=concrete` for frame 3), then write it into the sim with `xcrun simctl spawn <udid> defaults write com.laserlabstudio.jackflash CapacitorStorage.jackflash_data -string "$(cat seed.json)"` before first launch.
3. Capture the six screens per the spec (plus `pz_top.png`, the Parent Zone top, for a clean iPhone status bar) with `xcrun simctl io <udid> screenshot`.
4. `python3 compose.py <repo> <captures-dir> iphone|ipad <out-dir>` (needs Pillow and Google Chrome for headless rendering).
