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

import { useEffect, useRef } from 'react';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import mermaid from 'mermaid';

import { MermaidProps } from './props';
import { ZoomHandler } from './zoomHandler';

let fullscreenDiagramId = 0;

/**
 * Fullscreen modal for a single Mermaid diagram. Open whenever
 * `diagramText` is non-null; re-renders the diagram at natural size and
 * attaches pan/zoom when `enableZoom` is set.
 */
export const MermaidFullscreenDialog = (props: {
  diagramText: string | null;
  properties: MermaidProps;
  onClose: () => void;
}) => {
  const { diagramText, properties, onClose } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (diagramText === null || !container) {
      return undefined;
    }

    let cancelled = false;
    const id = `mermaid-fullscreen-${fullscreenDiagramId++}`;
    mermaid
      .render(id, diagramText)
      .then(({ svg, bindFunctions }) => {
        if (cancelled) {
          return;
        }
        container.innerHTML = svg;
        bindFunctions?.(container);

        if (properties.enableZoom) {
          const svgEl = container.querySelector('svg');
          const zoomHandler = new ZoomHandler(
            container,
            svgEl as SVGSVGElement,
            properties.zoomOptions,
          );
          zoomHandler.initialize();
        }
      })
      .catch(e => {
        if (cancelled) {
          return;
        }
        container.textContent = diagramText;
        console.error('Failed to render fullscreen mermaid diagram', e);
      });

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [diagramText, properties]);

  return (
    <Dialog fullScreen open={diagramText !== null} onClose={onClose}>
      <IconButton
        aria-label="Close fullscreen diagram"
        onClick={onClose}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          overflow: 'hidden',
        }}
      />
    </Dialog>
  );
};
