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

import { act, screen, waitFor } from '@testing-library/react';
import { createTheme } from '@material-ui/core/styles';
import mermaid from 'mermaid';

import {
  registerFullscreenContext,
  openFullscreen,
  closeFullscreen,
} from './fullscreenBridge';

jest.mock('./zoomHandler');

describe('fullscreenBridge', () => {
  beforeEach(() => {
    jest.spyOn(mermaid, 'render').mockResolvedValue({
      svg: '<svg data-testid="fullscreen-svg"></svg>',
    } as Awaited<ReturnType<typeof mermaid.render>>);
  });

  afterEach(async () => {
    await act(async () => closeFullscreen());
    jest.restoreAllMocks();
  });

  it('is a no-op before any context is registered', () => {
    expect(() => openFullscreen('flowchart LR')).not.toThrow();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the dialog into its own root outside the addon tree', async () => {
    registerFullscreenContext({ properties: {}, theme: createTheme() });

    await act(async () => openFullscreen('flowchart LR'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByTestId('fullscreen-svg')).toBeInTheDocument();
  });

  it('closes the dialog via closeFullscreen', async () => {
    registerFullscreenContext({ properties: {}, theme: createTheme() });

    await act(async () => openFullscreen('flowchart LR'));
    await screen.findByRole('dialog');

    await act(async () => closeFullscreen());
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('uses the latest registered context', async () => {
    registerFullscreenContext({
      properties: { enableZoom: false },
      theme: createTheme(),
    });
    registerFullscreenContext({ properties: {}, theme: createTheme() });

    await act(async () => openFullscreen('flowchart LR'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mermaid.render).toHaveBeenCalledWith(
      expect.any(String),
      'flowchart LR',
    );
  });
});
