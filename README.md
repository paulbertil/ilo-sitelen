# ilo sitelen

Type toki pona, get a sitelen pona image to paste into WhatsApp, Discord or any chat. A free sitelen pona generator for your phone, no font to install.

A small installable web app (PWA). No build step, no backend: everything happens in the browser.

## Features

- Live preview that redraws as you type.
- **Copy image** puts a PNG on the clipboard. **Share** and **Save** are also available on the installed app.
- Capitalized words are treated as names and written in a cartouche, one glyph per sound. `jan Mali` becomes `[mama ala lipu ilo]`.
- Words outside pu and ku suli are flagged and drawn as plain letters.
- Punctuation follows sitelen pona conventions: `.` becomes the middle dot, `:` the colon glyph, `?` and `!` are kept, commas are dropped.
- Each sentence starts on its own line, like handwritten sitelen pona. Can be turned off.
- Three sizes and three color swatches: Theme, the default, draws the image Dark while the app is dark and White while it is light; Dark and White stay as they are. Settings are remembered between visits.
- Light or dark: the app follows your device, and the button in the top bar flips it: it shows pimeja while the app is light and walo while it is dark. Flip back to what your device shows and it follows the device again.
- Works offline once installed. An install banner explains how on iOS, Android and desktop.
- Opens from its cache, so it starts at once. When a new version is out, an Update banner offers it: one tap and the app reloads on the new version, message kept.
- **Recents** keeps the last 50 messages you copied, shared or saved, as the images you sent them. Open it from the panel button in the header; copy one again, tap it to bring it back into the message box, or remove it. Kept on this device only.

## Writing tips

- Write names with a capital letter, or build a cartouche yourself: `[mama ala lipu ilo]`.
- Join glyphs with `&`, stack with `-`, scale with `+`: `toki&pona`.
- Add `1` after a word for its alternate glyph: `mute1`, `sewi1`.
- A sentence ending in `.`, `!` or `?` starts a new line in the image. A line break in the text does too.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles, logic, and the embedded font |
| `manifest.webmanifest` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker that serves the app shell from cache and hands over to a new version when the user taps Update. Bump `CACHE` with every deploy |
| `icons/` | App icons, rendered from the font's `ilo` glyph |

## Run locally

Any static file server works. For example:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765/.

## Credits

Glyphs come from the [nasin nanpa](https://github.com/ETBCOR/nasin-nanpa) font by jan Itan, MIT licensed.
