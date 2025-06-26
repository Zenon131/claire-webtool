import { Windows } from 'chrome';

declare namespace Chrome {
  export interface SidePanel {
    open(options?: { windowId?: number }): void;
    setPanelBehavior(options: { openPanelOnActionClick: boolean }): void;
  }
}

declare global {
  namespace chrome {
    export const sidePanel: Chrome.SidePanel;
  }
}