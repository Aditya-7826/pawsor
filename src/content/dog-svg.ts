/**
 * The puppy, drawn facing right in an 80×70 viewBox. Every animatable part is its own
 * <g data-part="..."> so CSS can target it. Colours come from coat custom properties.
 */

export const DOG_PARTS = [
  'shadow',
  'rig',
  'tail',
  'leg-back-far',
  'leg-front-far',
  'body',
  'leg-back-near',
  'leg-front-near',
  'head',
  'ear-left',
  'ear-right',
  'eyes',
] as const;

export type DogPart = (typeof DOG_PARTS)[number];

const leg = (part: DogPart, x: number, shade: boolean): string => `
  <g data-part="${part}" class="pawsor-leg">
    <rect x="${x}" y="50" width="9" height="14" rx="4.5"
      fill="var(${shade ? '--coat-shade' : '--coat'})" />
    <ellipse cx="${x + 4.5}" cy="62.4" rx="4.6" ry="2.4" fill="var(--coat-light)" />
  </g>`;

const SVG_MARKUP = `
<svg class="pawsor-svg" viewBox="0 0 80 70" width="64" height="56"
  aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <g data-part="shadow">
    <ellipse cx="40" cy="65" rx="25" ry="3.6" fill="rgb(70 35 10 / 0.18)" />
  </g>
  <g data-part="rig">
    <g data-part="tail">
      <path d="M17 42 C8 41 4 33 7 27 C9 23 13 25 13 28 C15 24 20 26 18 31 C22 31 23 37 17 42 Z"
        fill="var(--coat)" stroke="var(--coat-shade)" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M9 29 C10 27 12 28 12 30" fill="none" stroke="var(--coat-light)"
        stroke-width="1.6" stroke-linecap="round" />
    </g>
    ${leg('leg-back-far', 17, true)}
    ${leg('leg-front-far', 40, true)}
    <g data-part="body">
      <ellipse cx="32" cy="46" rx="21" ry="14" fill="var(--coat)" />
      <ellipse cx="35" cy="52" rx="14" ry="7" fill="var(--coat-light)" />
    </g>
    ${leg('leg-back-near', 22, false)}
    ${leg('leg-front-near', 45, false)}
    <g data-part="head">
      <g data-part="ear-left">
        <path d="M39 18 Q40 3 46 1 Q52 7 52 15 Z" fill="var(--coat-shade)"
          stroke="var(--coat-shade)" stroke-width="2" stroke-linejoin="round" />
        <path d="M48 3 Q41 0 37.5 8 Q44 8.5 48 3 Z" fill="var(--coat-shade)" stroke="var(--coat)" stroke-width="0.6" />
      </g>
      <circle cx="53" cy="29" r="18" fill="var(--coat)" />
      <path d="M45 15 Q53 11 61 15 Q56 22 53 30 Q50 22 45 15 Z" fill="var(--coat-light)"
        opacity="0.9" />
      <ellipse cx="61" cy="36" rx="10" ry="7" fill="var(--coat-light)" />
      <ellipse class="pawsor-cheek" cx="47" cy="36" rx="3.6" ry="2.4" fill="var(--blush)" />
      <ellipse cx="68" cy="32" rx="3.2" ry="2.4" fill="#3b2a20" />
      <ellipse cx="67" cy="31.2" rx="1" ry="0.6" fill="#fff" opacity="0.8" />
      <path d="M63 37 Q65 39.5 67.5 37.4 M67.5 37.4 Q69.6 39.2 71 37" fill="none"
        stroke="#3b2a20" stroke-width="1.1" stroke-linecap="round" />
      <g data-part="eyes">
        <g class="pawsor-eyes-open">
          <ellipse cx="51.5" cy="27" rx="4" ry="4.6" fill="#2b1d16" />
          <ellipse cx="62" cy="26.5" rx="3.6" ry="4.3" fill="#2b1d16" />
          <circle cx="50.2" cy="25.3" r="1.6" fill="#fff" />
          <circle cx="60.8" cy="24.9" r="1.4" fill="#fff" />
          <circle cx="52.8" cy="28.8" r="0.7" fill="#fff" />
          <circle cx="63.2" cy="28.2" r="0.6" fill="#fff" />
        </g>
        <g class="pawsor-eyes-closed" fill="none" stroke="#2b1d16" stroke-width="1.4"
          stroke-linecap="round">
          <path d="M48 28 Q51.5 30.5 55 28" />
          <path d="M58.6 27.6 Q62 30 65.4 27.6" />
        </g>
        <g class="pawsor-eyes-happy" fill="none" stroke="#2b1d16" stroke-width="1.5"
          stroke-linecap="round">
          <path d="M48 28.5 Q51.5 24 55 28.5" />
          <path d="M58.6 28 Q62 23.6 65.4 28" />
        </g>
      </g>
      <g data-part="ear-right">
        <path d="M55 15 Q60 2 67 2 Q71 9 69 20 Z" fill="var(--coat)"
          stroke="var(--coat)" stroke-width="2" stroke-linejoin="round" />
        <path d="M58 14 Q61 6 65.5 5 Q67.5 10 66.5 17 Z" fill="var(--blush)" opacity="0.55" />
        <path d="M63.5 4 Q71 0 74.5 9 Q68.5 9.5 63.5 4 Z" fill="var(--coat-shade)" />
      </g>
    </g>
  </g>
</svg>`;

/** Build a fresh puppy SVG element. Markup is static, so innerHTML is safe here. */
export function createDogSvg(doc: Document = document): SVGSVGElement {
  const tpl = doc.createElement('template');
  tpl.innerHTML = SVG_MARKUP.trim();
  const svg = tpl.content.firstElementChild;
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error('Pawsor: failed to build dog SVG');
  }
  return svg;
}
