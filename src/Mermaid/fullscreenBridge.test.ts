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

import { registerFullscreenHandler, openFullscreen } from './fullscreenBridge';

describe('fullscreenBridge', () => {
  it('routes openFullscreen to the registered handler', () => {
    const handler = jest.fn();
    const unregister = registerFullscreenHandler(handler);

    openFullscreen('flowchart LR');
    expect(handler).toHaveBeenCalledWith('flowchart LR');

    unregister();
  });

  it('is a no-op when no handler is registered', () => {
    expect(() => openFullscreen('flowchart LR')).not.toThrow();
  });

  it('routes to the most recently registered handler after a remount', () => {
    // Simulates the addon remounting while the injected buttons persist:
    // instance A registers, instance B registers, then A unmounts.
    const handlerA = jest.fn();
    const handlerB = jest.fn();

    const unregisterA = registerFullscreenHandler(handlerA);
    const unregisterB = registerFullscreenHandler(handlerB);
    unregisterA();

    openFullscreen('flowchart LR');
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledWith('flowchart LR');

    unregisterB();
  });

  it('drops the handler once it unregisters itself', () => {
    const handler = jest.fn();
    const unregister = registerFullscreenHandler(handler);
    unregister();

    openFullscreen('flowchart LR');
    expect(handler).not.toHaveBeenCalled();
  });
});
