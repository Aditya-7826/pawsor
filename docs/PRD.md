# Pawsor — Product Requirements

## 1. Summary

Pawsor is a browser extension (Manifest V3, for Chrome, Edge and Brave) that puts a cute
cartoon puppy on every page you open. The puppy follows your cursor, naps when you stop,
jumps at rapid clicks, sits on text you highlight and loves being petted. It is a pure
user-experience project: success means delight, personality and polished
micro-interactions, never utility.

## 2. Goals

- Make browsing feel like having company.
- React quickly and believably to input so the dog feels alive.
- **Never get in the way**: no blocked clicks, typing, scrolling or selection on any site;
  never covers the cursor; never breaks a page's layout or styles.
- Be accessible: reduced motion, touch, keyboard-reachable popup, sound off by default.
- Be private and light: `storage` is the only permission; no network, no host permissions.

## 3. Non-goals

- No backend, accounts, analytics or remote code.
- No image or audio files except the extension icons. The dog is inline SVG; the bark is
  synthesized with Web Audio.
- No frameworks or animation libraries.
- Firefox and Safari are out of scope for now (see Open Questions).
- Running inside iframes (`all_frames: false`).

## 4. Users

- **Desktop browser user**: mouse or trackpad, clicks, highlights text.
- **Touch-screen user**: taps and selects text with a finger.
- **Motion-sensitive user**: has `prefers-reduced-motion: reduce`.
- **Keyboard user**: uses the popup via keyboard and the Alt+Shift+P shortcut.

## 5. Fixed decisions

| Area         | Decision                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| Platform     | Manifest V3; Chrome, Edge, Brave                                                 |
| Build        | Vite + vanilla TypeScript. Outputs `dist/content.js` (one IIFE, no runtime imports), `dist/popup.html` + `popup.js`, `dist/manifest.json`, icons |
| Injection    | `content_scripts` on `<all_urls>`, `run_at: document_idle`, `all_frames: false`  |
| Permissions  | `["storage"]` only. No `host_permissions`, `tabs`, `scripting` or remote code     |
| Isolation    | One host element at the end of `<body>` with a **closed** Shadow Root           |
| Dog          | Inline SVG ~64px wide, separate `<g>` per body part, CSS keyframes               |
| Movement     | `requestAnimationFrame` loop with lerp easing                                    |
| Behaviour    | Hand-written finite state machine; transitions in one pure function              |
| Sound        | Web Audio "boop", off by default                                                 |
| Settings     | `chrome.storage.sync`; live updates via `chrome.storage.onChanged`               |
| Shortcut     | `chrome.commands` `toggle-pawsor` = Alt+Shift+P                                  |
| Quality      | ESLint, Prettier, `tsc --noEmit`, Vitest                                         |
| Coats        | Honey (orange-tan, default), Cocoa (brown), Snow (white-grey)                    |

## 6. Features and acceptance criteria

Timing and distance constants are listed in `docs/ARCHITECTURE.md` §6.

### F1. Extension package and build

- AC1: `npm run build` produces `dist/` with `manifest.json`, `content.js`, `popup.html`,
  `popup.js`, `background.js` and icons at 16/32/48/128 px.
- AC2: `content.js` is a single IIFE with no `import`/`export` statements.
- AC3: The manifest declares only the `storage` permission, the content script on
  `<all_urls>` at `document_idle` with `all_frames: false`, an action popup, and the
  `toggle-pawsor` command with suggested key Alt+Shift+P.
- AC4: Loading `dist/` via "Load unpacked" shows no errors in `chrome://extensions`.
- Edge: The build fails (non-zero exit) if `content.js` contains an `import` statement.

### F2. Injection

- AC1: On a normal web page, exactly one host element (`<pawsor-host>`) is appended at the
  end of `<body>`, with a closed Shadow Root holding all dog markup and CSS.
- AC2: Host style: `position: fixed; inset: 0; pointer-events: none; z-index: 2147483647`.
- AC3: The page's CSS cannot restyle the dog and the dog's CSS cannot leak into the page.
- AC4: Clicking, typing, scrolling and selecting on the page behave exactly as without Pawsor.
- Edge: A guard flag prevents double injection (e.g. the script is evaluated twice).
- Edge: If `document.body` is missing (XML, some SVG documents) Pawsor does nothing.
- Edge: If the page removes the host (SPA re-render of `<body>`), Pawsor re-attaches it.
- Edge: On pages with a strict Content Security Policy the styles still apply
  (constructable stylesheets, with a `<style>` fallback).
- Edge: If the extension is reloaded or updated, the old content script stops cleanly
  ("extension context invalidated") instead of throwing errors.
- Expected: Pawsor does not appear on `chrome://`, `edge://`, `brave://` pages, the Chrome
  Web Store or the built-in PDF viewer. Browsers block content scripts there.

### F3. The puppy

Chubby, round, corgi-like: big head, floppy-tipped ears, stubby legs, fluffy tail, blush
cheeks, big shiny eyes.

- AC1: About 64px wide; separate groups for shadow, body, head, left ear, right ear,
  eyes, tail and each of four legs.
- AC2: Coat colour is set by CSS custom properties, so a coat change swaps no markup.
- AC3: Faces left or right based on horizontal movement.
- AC4: The SVG is `aria-hidden="true"` and `focusable="false"`.
- Edge: Facing does not flicker on tiny horizontal jitter (dead zone).

### F4. Idle

- AC1: Breathing animation, a blink every ~2–6s, an occasional ear twitch.
- AC2: Eyes and head turn slightly toward the cursor.

### F5. Follow

- AC1: Cursor more than ~80px from the dog → state `follow`.
- AC2: Eased (lerp) movement with a trot leg cycle; speed grows with distance up to a cap.
- AC3: Stops ~40px from the cursor and never covers it; then returns to `idle`.
- AC4: Frame-rate independent; a long frame gap never makes the dog jump.
- Edge: Cursor in a corner where the dog cannot get closer → no endless follow/idle flicker.

### F6. Sit

- AC1: Cursor still for 2s while idle → sits and wags its tail slowly.
- AC2: Cursor moves beyond the follow threshold → stands and follows.
- Edge: Small movement near the dog does not break the sit.

### F7. Sleep

- AC1: No input (pointer, click, key, scroll, touch) for 12s → lies down, eyes closed,
  floating "z z z".
- AC2: Any input wakes it with a stretch, then idle.
- Edge: The inactivity clock resets when the tab becomes visible again.
- Edge: Typing on the page counts as input (keydown listener, passive, never intercepted).

### F8. Startled

- AC1: 3+ clicks within 600ms → jump, ears pop up, "!" bubble, then idle after ~900ms.
- AC2: More rapid clicks while startled do not restart or stack the animation.
- Edge: A triple-click to select a paragraph also startles (that is fine and cute), and
  the resulting selection then makes the dog perch once startled ends.

### F9. Perch

- AC1: Non-empty text selection → dog walks to it and sits on top of its first line.
- AC2: Selection cleared → leaves the perch, back to idle.
- AC3: Scrolling while perched keeps the dog on the text; if the text scrolls out of
  view, the perch point is clamped to the viewport edge.
- Edge: Selections inside `<input>`/`<textarea>` are ignored (no reliable rect).
- Edge: Collapsed selections never trigger perch.

### F10. Petted

- AC1: ≥4 horizontal direction changes within 1s while the cursor is over the dog →
  `petted`: fast tail wag, happy eyes, floating hearts.
- AC2: If sound is on, one synthesized "boop" per petting session.
- AC3: Back to idle ~1.5s after the wiggling stops.
- Edge: At most 6 hearts alive at once.
- Edge: Audio starts only after a user gesture; if Web Audio is unavailable, silent.

### F11. Popup

- AC1: Opened from the toolbar icon. Cozy style: warm cream, rounded, friendly font.
- AC2: Controls: show/hide Pawsor; coat picker with previews; sound on/off (off by
  default); "Disable on this site" toggle showing the current hostname.
- AC3: Changes save to `chrome.storage.sync` and update all open tabs live via
  `chrome.storage.onChanged`, without reload.
- AC4: Fully keyboard reachable, visible focus rings, `aria-label`s; toggles use
  `role="switch"` + `aria-checked`; coats are a radio group with arrow-key movement.
- Edge: On a page where Pawsor cannot run (chrome://, Web Store, PDF) the site toggle is
  disabled with the note "Pawsor can't visit this page".
- Edge: Corrupt or missing stored settings → defaults.
- Edge: Disabled-sites list is capped (200 hostnames) to stay inside sync storage quotas.

### F12. Shortcut

- AC1: Alt+Shift+P toggles show/hide everywhere (stored setting; all tabs update).
- AC2: The shortcut can be changed in `chrome://extensions/shortcuts`.
- Edge: If another extension owns Alt+Shift+P, the browser leaves it unassigned; the
  popup still works.

### F13. Accessibility and resilience

- AC1: `prefers-reduced-motion: reduce` → no trotting, bouncing or floating particles;
  the dog fades out and back in at its new spot; hearts and "z" fade in place.
- AC2: Touch screens: the dog follows tap positions.
- AC3: Hidden while `document.fullscreenElement` exists; back when fullscreen ends.
- AC4: Loop paused while the tab is hidden; resumes without a jump.
- AC5: On resize the dog is clamped back inside the viewport.

## 7. Critical flows

1. Install unpacked → open any website → dog appears bottom-left, idle.
2. Move the cursor far → dog trots and stops short of it.
3. Stay still → sits; wait → sleeps; move → stretches and wakes.
4. Highlight text → perches; click elsewhere → leaves.
5. Rapid triple-click → startled.
6. Wiggle over the dog → hearts (and a boop if sound is on).
7. Popup: change coat → all open tabs update live; disable on this site → dog leaves only here.
8. Alt+Shift+P → dog hides everywhere; again → returns.
9. Fullscreen a video → dog hides; exit → returns.

## 8. Definition of Done

- Requirements implemented and acceptance criteria met.
- Critical flows work in the browser with the unpacked extension.
- `npm run lint`, `npm run typecheck` and `npm run test` pass.
- `npm run build` succeeds.
- Docs updated to reflect the change.

## 9. Open Questions

- **Background service worker.** `chrome.commands.onCommand` only fires in extension pages
  or a service worker, not in content scripts or a closed popup. The shortcut therefore
  needs a tiny `dist/background.js` that flips the `visible` setting. This file is not in
  the original output list. Proposed: add it (no extra permission needed).
- **Icons.** Proposed: keep an `icons/icon.svg` source of the dog's face and commit PNGs
  rendered from it once, rather than adding a rasterizer dependency to the build.
- Should "Disable on this site" also cover subdomains (`news.example.com` when
  `example.com` is disabled)? Assumption: exact hostname only.
- Firefox support (MV3 with `browser.*`) later?
- Should the dog appear inside large same-origin iframes (e.g. web IDEs)? Assumption: no.
- Should the dog walk in from off-screen on page load instead of appearing bottom-left?
