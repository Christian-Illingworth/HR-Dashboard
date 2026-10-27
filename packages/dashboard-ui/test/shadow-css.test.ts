// T031: the shadow-root stylesheet is scoped correctly, up to date, and never touches design-kit/.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM build script without type declarations
import { buildShadowCss, KIT_FILES, moduleSource } from '../scripts/build-shadow-css.mjs';
import { shadowCss } from '../src/styles/shadow.generated';

const hashKit = () =>
  (KIT_FILES as string[]).map((f) => createHash('sha256').update(readFileSync(f)).digest('hex')).join(',');

describe('shadow-root stylesheet', () => {
  const before = hashKit();
  const css: string = buildShadowCss();

  it('starts by resetting inherited styles at the boundary', () => {
    expect(css.startsWith(':host { all: initial; display: block; }')).toBe(true);
  });

  it('has no :root, html or body selectors and no @font-face left', () => {
    const root = postcss.parse(css);
    const offending: string[] = [];
    root.walkRules((rule) => {
      for (const s of rule.selectors) {
        if (/(^|[\s>+~(,])(:root|html|body)($|[\s.:#[>+~,)])/.test(s)) offending.push(s);
      }
    });
    let fontFaces = 0;
    root.walkAtRules('font-face', () => {
      fontFaces++;
    });
    expect(offending).toEqual([]);
    expect(fontFaces).toBe(0);
    expect(css).toContain(':host {'); // tokens moved onto the host
    expect(css).toContain('.cu-root {'); // body styles moved onto the root element
  });

  it('keeps the kit components and the project styles', () => {
    expect(css).toContain('.kpi-strip');
    expect(css).toContain('.seg-btn');
    expect(css).toContain('.hrd-dashboard');
  });

  it('is committed up to date (src/styles/shadow.generated.ts)', () => {
    expect(shadowCss).toBe(css);
    expect(moduleSource(css)).toContain('export const shadowCss = ');
  });

  it('leaves the design-kit files unchanged', () => {
    expect(hashKit()).toBe(before);
  });
});
