# ilo sitelen

Type toki pona, get a sitelen pona image to paste into WhatsApp, Discord or any chat. A free sitelen pona generator for your phone, no font to install.

A small installable web app (PWA). No build step, no backend: everything happens in the browser.

## Features

- Live preview that redraws as you type.
- **Copy image** puts a PNG on the clipboard. **Share** and **Save** are also available on the installed app.
- Capitalized words are treated as names and written in a cartouche, one glyph per sound. `jan Mali` becomes `[mama ala lipu ilo]`.
- Words the font cannot draw (outside pu, ku suli and the four ku lili linluwi, su, te and to) get a dashed red underline in the box (the word still being typed is spared), are listed under it, and are drawn as plain letters.
- Tap a glyph in the preview to see which word it is: the glyph and its word get the same ochre ring, and a bubble over the word shows the glyph, the word and its meaning. Tap the glyph again, tap anywhere else, or edit the text to clear it.
- Punctuation follows sitelen pona conventions: `.` becomes the middle dot, `:` the colon glyph, `?` and `!` are kept, commas are dropped. Inside a cartouche a comma stays: it is the syllable tick of nasin sitelen kalama pi linja lili, so `[pona,,]` reads Pona.
- Long glyphs: `pi(toki pona)` stretches pi under the phrase, `(tenpo ni) la` stretches la back under it. The font has long forms for a, alasa, anu, awen, kama, ken, kepeken, la, lon, nanpa, open, pi, pini, sona, tawa, wile and n; a run with a word the font cannot draw, or with a name in it, falls apart into its words.
- Each sentence starts on its own line, like handwritten sitelen pona. Can be turned off.
- **Settings** open from the chip at the bottom left of the preview, as a list in a dialog with a line of help per row: three sizes and three colors, each as a full-width pill of three buttons, where the Theme color, the default, draws the image Dark while the app is dark and White while it is light, and Dark and White stay as they are; and switches for names and lines. Settings are remembered between visits.
- Light or dark: the app follows your device, and the button in the top bar flips it: it shows pimeja while the app is light and walo while it is dark. Flip back to what your device shows and it follows the device again.
- Works offline once installed. An install banner explains how on iOS, Android and desktop.
- Opens from its cache, so it starts at once. When a new version is out, an Update banner offers it: one tap and the app reloads on the new version, message kept.
- **Recents** keeps the last 50 messages you copied, shared or saved, as the images you sent them. Open it from the panel button in the header; copy one again, tap it to bring it back into the message box, or remove it. Kept on this device only.
- **Cheat sheet**: every word the app draws, as a glyph tile with the word and a short meaning, grouped by function and theme, with a dashed tile for each alternate glyph and a last group for the app's marks. Open it from the book icon above the message box, or from the "Check the cheat sheet" link when a word is flagged. A tap puts the word into your message where the caret last was, spaced as the parser needs; `[ ]` opens a cartouche and steps out of it again. On a phone it is a bottom sheet that stays open while you tap; on a wide screen it is a column beside the box and the caret goes back to the box after each tap.

## Writing tips

- Write names with a capital letter, or build a cartouche yourself: `[mama ala lipu ilo]`.
- Join glyphs with `&`, stack with `-`, scale with `+`: `toki&pona`.
- Add `1` after a word for its alternate glyph, or a higher number where there are more: `mute1`, `sewi1`, `ni3`.
- Put the words a long glyph covers in parentheses: `pi(toki pona)`, `(tenpo ni) la`.
- In a cartouche, a comma after a glyph reads a syllable instead of the first letter: `[pona,,]` is Pona.
- A sentence ending in `.`, `!` or `?` starts a new line in the image. A line break in the text does too.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles, logic, and the embedded font |
| `manifest.webmanifest` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker that serves the app shell from cache and hands over to a new version when the user taps Update. Bump `CACHE` with every deploy |
| `icons/` | App icons, rendered from the font's `ilo` glyph |
| `scripts/` | `og.html` draws the link card image; `test-place.mjs` checks where a cheat sheet tap lands |

## Run locally

Any static file server works. For example:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765/.

The cheat sheet's landing rules (where a tapped word, glue mark or cartouche goes) have a test:

```sh
node scripts/test-place.mjs
```

## Credits

Glyphs come from the [nasin nanpa](https://github.com/ETBCOR/nasin-nanpa) font by jan Itan, MIT licensed.

Word meanings in the cheat sheet follow Sonja Lang's public-domain dictionary in *Toki Pona: The Language of Good* (2014) and her word data at [tokipona.org/nimi_pu.txt](https://tokipona.org/nimi_pu.txt) and [tokipona.org/nimi_pi_pu_ala.txt](https://tokipona.org/nimi_pi_pu_ala.txt). Which words count as rare follows [lipu Linku](https://linku.la)'s 2026 word survey.
