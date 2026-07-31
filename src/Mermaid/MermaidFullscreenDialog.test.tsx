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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StylesProvider, jssPreset } from '@material-ui/core/styles';
import { create } from 'jss';
import mermaid from 'mermaid';

import { MermaidFullscreenDialog } from './MermaidFullscreenDialog';
import { ZoomHandler } from './zoomHandler';

jest.mock('./zoomHandler');

describe('MermaidFullscreenDialog', () => {
  beforeEach(() => {
    jest.spyOn(mermaid, 'render').mockResolvedValue({
      svg: '<svg data-testid="fullscreen-svg"></svg>',
    } as Awaited<ReturnType<typeof mermaid.render>>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (ZoomHandler as jest.Mock).mockClear();
  });

  it('is closed when diagramText is null', () => {
    render(
      <MermaidFullscreenDialog diagramText={null} properties={{}} onClose={jest.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the diagram when open', async () => {
    render(
      <MermaidFullscreenDialog diagramText="flowchart LR" properties={{}} onClose={jest.fn()} />,
    );
    expect(await screen.findByTestId('fullscreen-svg')).toBeInTheDocument();
    expect(mermaid.render).toHaveBeenCalledWith(expect.any(String), 'flowchart LR');
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = jest.fn();
    render(
      <MermaidFullscreenDialog diagramText="flowchart LR" properties={{}} onClose={onClose} />,
    );
    await userEvent.click(await screen.findByLabelText('Close fullscreen diagram'));
    expect(onClose).toHaveBeenCalled();
  });

  it('attaches a ZoomHandler when enableZoom is set', async () => {
    render(
      <MermaidFullscreenDialog
        diagramText="flowchart LR"
        properties={{ enableZoom: true, zoomOptions: { scaleExtent: [0.5, 5] } }}
        onClose={jest.fn()}
      />,
    );
    await screen.findByTestId('fullscreen-svg');
    await waitFor(() => expect(ZoomHandler).toHaveBeenCalledTimes(1));
    expect((ZoomHandler as jest.Mock).mock.calls[0][2]).toEqual({ scaleExtent: [0.5, 5] });
  });

  it('does not attach a ZoomHandler when enableZoom is off', async () => {
    render(
      <MermaidFullscreenDialog diagramText="flowchart LR" properties={{}} onClose={jest.fn()} />,
    );
    await screen.findByTestId('fullscreen-svg');
    expect(ZoomHandler).not.toHaveBeenCalled();
  });

  it('injects dialog styles into document.head even under a shadow-scoped styles provider', async () => {
    // TechDocs wraps addons in a StylesProvider whose JSS inserts styles
    // into the shadow root. The dialog portals to document.body, so its
    // styles must escape to document.head or it renders unstyled.
    const shadowInsertionPoint = document.createElement('div');
    const shadowJss = create({ ...jssPreset(), insertionPoint: shadowInsertionPoint });

    render(
      <StylesProvider jss={shadowJss}>
        <MermaidFullscreenDialog diagramText="flowchart LR" properties={{}} onClose={jest.fn()} />
      </StylesProvider>,
    );
    await screen.findByTestId('fullscreen-svg');

    const headRules = Array.from(document.head.querySelectorAll('style'))
      .map(s => s.textContent)
      .join('');
    expect(headRules).toContain('.MuiDialog-paperFullScreen');
  });

  it('falls back to raw text and logs when render fails', async () => {
    const error = new Error('Parse error');
    jest.spyOn(mermaid, 'render').mockRejectedValue(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MermaidFullscreenDialog diagramText="flowchart LR" properties={{}} onClose={jest.fn()} />,
    );

    expect(await screen.findByText('flowchart LR')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to render fullscreen mermaid diagram',
      error,
    );
  });
});
