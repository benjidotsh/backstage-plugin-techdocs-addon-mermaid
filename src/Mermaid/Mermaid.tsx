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

import { useEffect, useState } from 'react';
import { PaletteType, useTheme } from '@material-ui/core';

import { useShadowRootElements } from '@backstage/plugin-techdocs-react';
import mermaid, { MermaidConfig } from 'mermaid'
import { isMermaidCode } from './hooks';
import { MermaidProps } from './props';
import { BackstageTheme } from '@backstage/theme';
import { ZoomHandler } from './zoomHandler';
import { deepMerge } from './utils';
import { MermaidFullscreenDialog } from './MermaidFullscreenDialog';

export function selectConfig(backstagePalette: PaletteType, properties: MermaidProps): MermaidConfig {
  // Determine the default config based on palette
  const defaultConfig = backstagePalette === 'light'
    ? (properties.lightConfig || {})
    : Object.assign({ theme: 'dark' }, properties.darkConfig);

  // If a config is provided, deep merge it with the default config (user values take precedence)
  if (properties.config) {
    return deepMerge(defaultConfig, properties.config);
  }

  return defaultConfig;
}

/**
 * Show report issue button when text is highlighted
 */

let diagramId = 0

// Material 'fullscreen' icon, inlined because the shadow root has no stylesheets
const FULLSCREEN_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';

const addFullscreenButton = (
  diagramElement: HTMLDivElement,
  diagramText: string,
  onOpenFullscreen: (text: string) => void,
) => {
  diagramElement.style.position = 'relative';

  const button = document.createElement('button');
  button.setAttribute('aria-label', 'Open diagram fullscreen');
  button.innerHTML = FULLSCREEN_ICON_SVG;
  button.style.cssText = [
    'position: absolute',
    'top: 8px',
    'right: 8px',
    'display: flex',
    'padding: 4px',
    'border: none',
    'border-radius: 4px',
    'background: rgba(128, 128, 128, 0.2)',
    'color: inherit',
    'cursor: pointer',
    'opacity: 0',
    'transition: opacity 0.2s',
  ].join(';');
  button.addEventListener('click', () => onOpenFullscreen(diagramText));

  // Hover/focus reveal via listeners — no stylesheet available in the shadow root
  const show = () => { button.style.opacity = '1'; };
  const hide = () => { button.style.opacity = '0'; };
  diagramElement.addEventListener('mouseenter', show);
  diagramElement.addEventListener('mouseleave', hide);
  button.addEventListener('focus', show);
  button.addEventListener('blur', hide);

  diagramElement.appendChild(button);
};

const makeDiagram = async (
  el: HTMLDivElement | HTMLPreElement,
  diagramText: string,
  properties: MermaidProps,
  onOpenFullscreen: (text: string) => void,
) => {
  el.style.display = 'none'

  const diagramElement = document.createElement('div')
  diagramElement.className = "mermaid"
  // Clip the element when outside parent when panning
  diagramElement.style.overflow = 'hidden';

  el.parentNode?.insertBefore(diagramElement, el.nextSibling);

  const id = `mermaid-${diagramId++}`
  try {
    const { svg, bindFunctions } = await mermaid.render(id, diagramText);
    diagramElement.innerHTML = svg
    bindFunctions?.(diagramElement);

    if (properties.enableZoom) {
      const svgEl = diagramElement.querySelector('svg');
      const zoomHandler = new ZoomHandler(
       diagramElement,
       svgEl as SVGSVGElement,
       properties.zoomOptions,
      );
      zoomHandler.initialize();
    }

    if (properties.enableFullscreen) {
      addFullscreenButton(diagramElement, diagramText, onOpenFullscreen);
    }
  } catch (e) {
    el.style.display = ''
    diagramElement.remove()
    console.error('Failed to render mermaid diagram', e)
  }
}

export const MermaidAddon = (properties: MermaidProps) => {
  const highlightTables = useShadowRootElements<HTMLDivElement>(['.highlighttable']);
  const highlightDivs = useShadowRootElements<HTMLDivElement>(['.highlight']);
  const mermaidPreBlocks = useShadowRootElements<HTMLPreElement>(['.mermaid']);
  const theme = useTheme<BackstageTheme>();

  const [ initialized, setInitialized ] = useState(false);
  const [fullscreenDiagramText, setFullscreenDiagramText] = useState<string | null>(null);

  useEffect(() => {
    if (initialized) {
      return;
    }
    const config: MermaidConfig = selectConfig(theme.palette.type, properties);
    if ( properties.iconLoaders ) {
      mermaid.registerIconPacks(properties.iconLoaders);
    }
    if (properties.layoutLoaders) {
      mermaid.registerLayoutLoaders(properties.layoutLoaders);
    }
    mermaid.initialize({ suppressErrorRendering: true, ...config });
    setInitialized(true);
  }, [initialized, properties, theme.palette.type]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    highlightTables.forEach(highlightTable => {
      if (!highlightTable.classList.contains('language-text')) {
         return;
      }

      // Skip already processed
      if (highlightTable.style.display === 'none') {
        return
      }

      const codeBlock = highlightTable.querySelector('code')
      if (!codeBlock) {
        return
      }

      const diagramText = codeBlock.textContent || ''

      // Ideally we could detect mermaid based on some annotation, but use a regex for now
      if (!isMermaidCode(diagramText)) {
        return
      }

      makeDiagram(highlightTable, diagramText, properties, setFullscreenDiagramText)
    });
  }, [initialized, highlightTables, properties]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    highlightDivs.forEach(highlightDiv => {
      if (!highlightDiv.classList.contains('language-text')) {
         return;
      }

      // Skip already processed
      if (highlightDiv.style.display === 'none') {
        return
      }

      // skip mkdocs-material < 9 code blocks (handled above)
      const table = highlightDiv.querySelector('table')
      if (!table) {
        return
      }

      const codeBlock = highlightDiv.querySelector('code')
      if (!codeBlock) {
        return
      }

      const diagramText = codeBlock.textContent || ''

      // Ideally we could detect mermaid based on some annotation, but use a regex for now
      if (!isMermaidCode(diagramText)) {
        return
      }

      makeDiagram(highlightDiv, diagramText, properties, setFullscreenDiagramText)
    });
  }, [initialized, highlightDivs, properties]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    mermaidPreBlocks.forEach(mermaidPreBlock => {
      // Skip already processed
      if (mermaidPreBlock.style.display === 'none') {
        return
      }

      const codeBlock = mermaidPreBlock.querySelector('code')
      if (!codeBlock) {
        return
      }

      const diagramText = codeBlock.textContent || ''

      makeDiagram(mermaidPreBlock, diagramText, properties, setFullscreenDiagramText)
    });
  }, [initialized, mermaidPreBlocks, properties]);

  return (
    <MermaidFullscreenDialog
      diagramText={fullscreenDiagramText}
      properties={properties}
      onClose={() => setFullscreenDiagramText(null)}
    />
  );
};
