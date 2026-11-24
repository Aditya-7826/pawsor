# Pawsor — Design System

Soft, cozy and warm: cream paper, rounded shapes, a friendly rounded font and a chubby
puppy. On other people's websites the dog must feel like a guest: small, gentle, and
never louder than the page.

## 1. Tokens

Popup tokens live on `:root` in `src/popup/popup.css`. Dog tokens live on `:host` inside
the Shadow Root (`src/content/dog.css`), so no page can override them.

### Colour

| Token          | Value     | Use                                   |
| -------------- | --------- | ------------------------------------- |
| `--cream`      | `#fff6e9` | Popup background                      |
| `--cream-deep` | `#fbe9d2` | Hover fills, off-switch track         |
| `--card`       | `#fffdf8` | Popup rows                            |
| `--ink`        | `#3b2a20` | Text (≥ 12:1 on cream)                |
| `--ink-soft`   | `#6b5446` | Secondary text (≥ 6:1 on cream)       |
| `--accent`     | `#e0763c` | On-switch track, selected swatch ring |
| `--accent-ink` | `#a2461b` | Accent text on cream (≥ 4.5:1)        |
| `--line`       | `#efd9bf` | Borders                               |
| `--blush`      | `#ff9eae` | Dog cheeks, hearts                    |
| `--focus`      | `#2f6fdf` | Focus outline (distinct from accent)  |

### Coat palettes

Each coat sets `--coat`, `--coat-shade`, `--coat-light` on the dog root.

| Coat  | `--coat`  | `--coat-shade` | `--coat-light` |
| ----- | --------- | -------------- | -------------- |
| Honey | `#e9a25f` | `#c97c3c`      | `#fff1dc`      |
| Cocoa | `#8a5a3b` | `#6a4029`      | `#f2dcc8`      |
| Snow  | `#eceae6` | `#c9c5bf`      | `#ffffff`      |

### Type

- Stack: `ui-rounded, "SF Pro Rounded", "Nunito", "Quicksand", "Varela Round",
"Trebuchet MS", system-ui, sans-serif`. No font files are bundled.
- Popup scale: 12 / 14 / 16 / 20 px. Body 14px, line-height 1.5.
- Bubbles in the Shadow Root use the same stack at 13px, bold.

### Space, radius, shadow

- Space: 4, 8, 12, 16, 24 px.
- Radius: `--r-sm: 10px`, `--r-md: 16px`, `--r-pill: 999px`.
- Shadow: `--shadow-soft: 0 4px 16px rgb(120 70 30 / 0.12)`.

### Motion

| Token          | Value                               | Use                  |
| -------------- | ----------------------------------- | -------------------- |
| `--ease-soft`  | `cubic-bezier(0.25, 0.8, 0.25, 1)`  | UI, pose changes     |
| `--ease-boing` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Jumps, ear pops      |
| `--t-fast`     | `140ms`                             | Hover, press, facing |
| `--t-med`      | `260ms`                             | Fades, pose changes  |

Reduced motion: every `--ease-boing` animation, leg cycle, floating particle and travel
animation is turned off; fades ≤ 260ms remain.

## 2. Components

"n/a" means the state does not apply (no async work or data source).

### 2.1 Overlay host (`<pawsor-host>`)

Fixed, full-viewport, `pointer-events: none`, `z-index: 2147483647`, closed Shadow Root.
`:host { all: initial; }` resets inherited page styles.

| State    | Behaviour                                                                 |
| -------- | ------------------------------------------------------------------------- |
| Loading  | Not mounted until settings are read (avoids a flash of the wrong coat)    |
| Empty    | n/a                                                                       |
| Error    | Injection blocked or `body` missing → nothing rendered, no console noise  |
| Success  | Dog visible and animating                                                 |
| Disabled | Hidden setting, site disabled or fullscreen → host `hidden`, loop stopped |

### 2.2 Dog (`.pawsor-dog`)

Behaviour states map to `data-state`
(`idle | follow | sit | sleep | startled | perch | petted`), plus `data-waking` during
the stretch and `data-facing="left|right"`. Each state drives keyframes on parts:

- `idle`: breathe (3s), blink and ear twitch (JS-triggered classes), look toward cursor.
- `follow`: front and back legs in opposite phase, body bob; speed via `--trot-speed`.
- `sit` / `perch`: rump down, back legs tucked, slow wag (1.2s).
- `sleep`: lying pose, closed-eye arcs, "z" glyphs float and fade.
- `startled`: jump (`--ease-boing`), ears up, "!" bubble.
- `petted`: fast wag (0.25s), happy eyes, hearts.

Facing flips an inner wrapper with `scaleX(-1)` so it never fights the position transform.
States: loading/empty/error/disabled are inherited from the host.

### 2.3 Speech bubble (`.pawsor-bubble`)

Rounded bubble above the head for "!" and "z z z".

| State    | Visual                         |
| -------- | ------------------------------ |
| Empty    | Not rendered                   |
| Success  | Pops in, then fades            |
| Disabled | Not rendered while host hidden |

### 2.4 Heart particle (`.pawsor-heart`)

Blush-pink heart, floats up 30px and fades over 900ms, then removed. Max 6. Reduced
motion: fades in place.

### 2.5 Popup (`popup.html`, 300px wide)

Layout, top to bottom: header (small dog-face mark + "Pawsor"), "Show Pawsor" switch,
coat picker, "Bark sound" switch, "Disable on this site" switch with the hostname, and a
footer hint "Shortcut: Alt+Shift+P".

| State    | Visual                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading  | Controls rendered with `aria-busy="true"` on the form and `disabled` until settings load (normally < 50ms)                                                             |
| Empty    | n/a (defaults are always available)                                                                                                                                    |
| Error    | Storage read fails → defaults shown with a small note "Settings couldn't be saved"; site toggle on an unsupported page → disabled, note "Pawsor can't visit this page" |
| Success  | Controls reflect stored settings; changes apply instantly                                                                                                              |
| Disabled | When "Show Pawsor" is off, coat and sound rows dim to 60% but stay usable (changes apply when shown)                                                                   |

#### Switch (`button role="switch"`)

44×24 track, 20px knob. Off: `--cream-deep` track. On: `--accent` track. Label text is
the accessible name; `aria-checked` reflects state. States: default, hover, active
(knob widens), focus-visible, checked, disabled (50% opacity, `disabled` attribute).

#### Coat swatch (`button role="radio"`)

Group: `role="radiogroup"`, `aria-label="Coat colour"`. Each swatch is a 56×56 tile with
a mini dog-face preview in that coat and the coat name below. Selected: 3px `--accent`
ring and `aria-checked="true"`; roving `tabindex`; Arrow keys move and select.

## 3. Accessibility rules (mandatory)

1. Dog SVG, bubbles and hearts are `aria-hidden="true"`; the host is never focusable and
   uses `pointer-events: none`.
2. Pawsor never calls `preventDefault`/`stopPropagation` on page events and only uses
   passive listeners. It must never block clicks, typing, scrolling or selection.
3. Every popup control is a native `<button>` with an accessible name.
4. Visible `:focus-visible` outline (3px `--focus`, 2px offset) on every control.
5. Text contrast meets WCAG AA (4.5:1 text, 3:1 UI boundaries).
6. `prefers-reduced-motion: reduce` disables bouncy, looping and travelling animation.
7. Sound is off by default and only plays after a user gesture.
8. Pawsor never changes or clears the user's selection.
9. Popup hit targets are at least 32×32px.
10. The dog never conveys information; hiding it loses nothing.
