/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createRoot, Root } from 'react-dom/client';
import { Theme } from '@material-ui/core';
import { ThemeProvider } from '@material-ui/core/styles';

import { MermaidProps } from './props';
import { MermaidFullscreenDialog } from './MermaidFullscreenDialog';

/**
 * Bridge between fullscreen buttons injected into the TechDocs shadow DOM
 * and the fullscreen dialog.
 *
 * The dialog cannot be rendered from the MermaidAddon component tree:
 * TechDocs mounts addon instances through a portal whose subtree is
 * unreliable — on the entity docs page it mounts duplicate instances with
 * colliding keys and defers their updates indefinitely, so a dialog
 * rendered there never commits. Instead, the addon registers its props and
 * theme here on mount, and the dialog renders into a dedicated React root
 * on document.body, outside the TechDocs-owned tree.
 */

interface FullscreenContext {
  properties: MermaidProps;
  theme: Theme;
}

let context: FullscreenContext | null = null;
let root: Root | null = null;

/**
 * Registers the addon props and theme used to render the fullscreen
 * dialog. Called by MermaidAddon on mount; the latest registration wins.
 */
export const registerFullscreenContext = (ctx: FullscreenContext) => {
  context = ctx;
};

const renderDialog = (diagramText: string | null) => {
  if (!context) {
    return;
  }
  if (!root) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  root.render(
    <ThemeProvider theme={context.theme}>
      <MermaidFullscreenDialog
        diagramText={diagramText}
        properties={context.properties}
        onClose={closeFullscreen}
      />
    </ThemeProvider>,
  );
};

/**
 * Opens the fullscreen dialog for the given diagram. Called by the buttons
 * injected next to each diagram.
 */
export const openFullscreen = (diagramText: string) => {
  renderDialog(diagramText);
};

/**
 * Closes the fullscreen dialog.
 */
export const closeFullscreen = () => {
  renderDialog(null);
};
