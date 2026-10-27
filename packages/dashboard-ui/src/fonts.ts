// Poppins @font-face rules, declared once at document level. @font-face inside a shadow root
// isn't reliably applied, so the kit's own rules are stripped from the shadow stylesheet
// (scripts/build-shadow-css.mjs) and added here instead (research R2).

export type FontWeight = 400 | 500 | 600 | 700 | 800;
export type FontUrls = Record<FontWeight, string>;

const STYLE_ID = 'hrd-poppins-font-faces';

export function fontFaceCss(urls: FontUrls): string {
  return (Object.keys(urls) as unknown as FontWeight[])
    .map(
      (w) =>
        `@font-face { font-family: 'Poppins'; font-style: normal; font-weight: ${w}; font-display: swap; src: url('${urls[w]}') format('woff2'); }`,
    )
    .join('\n');
}

export function ensureFonts(urls: FontUrls, doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = fontFaceCss(urls);
  doc.head.appendChild(style);
}
