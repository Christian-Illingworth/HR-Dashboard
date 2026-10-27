// Mounts the dashboard inside an open shadow root, so the kit's styles stay in and SharePoint's
// stay out (constitution Principle III, research R2). Menus and tooltips render inside the
// same shadow root; kit.js is not used.

import ReactDOM from 'react-dom';
import { App } from './App';
import type { DashboardClient } from './data/DashboardClient';
import { ensureFonts, type FontUrls } from './fonts';
import { shadowCss } from './styles/shadow.generated';

export interface MountOptions {
  client: DashboardClient;
  noAccessContact: string;
  /** Poppins font URLs; added to the page once. */
  fonts?: FontUrls;
}

export interface MountedDashboard {
  unmount(): void;
}

export function mountDashboard(host: HTMLElement, options: MountOptions): MountedDashboard {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();

  const style = document.createElement('style');
  style.textContent = shadowCss;
  const root = document.createElement('div');
  root.className = 'cu-root';
  shadow.append(style, root);

  if (options.fonts) ensureFonts(options.fonts, host.ownerDocument);

  ReactDOM.render(<App client={options.client} noAccessContact={options.noAccessContact} />, root);
  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(root);
      shadow.replaceChildren();
    },
  };
}
