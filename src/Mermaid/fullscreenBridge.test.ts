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

import {
  subscribeFullscreen,
  openFullscreen,
  closeFullscreen,
} from './fullscreenBridge';

describe('fullscreenBridge', () => {
  it('notifies a subscriber of opens and closes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeFullscreen(listener);
    listener.mockClear(); // ignore the initial-state call

    openFullscreen('flowchart LR');
    expect(listener).toHaveBeenCalledWith('flowchart LR');

    closeFullscreen();
    expect(listener).toHaveBeenCalledWith(null);

    unsubscribe();
  });

  it('notifies every subscriber, so whichever addon instance is live can render the dialog', () => {
    const a = jest.fn();
    const b = jest.fn();
    const unsubA = subscribeFullscreen(a);
    const unsubB = subscribeFullscreen(b);

    openFullscreen('flowchart LR');
    expect(a).toHaveBeenCalledWith('flowchart LR');
    expect(b).toHaveBeenCalledWith('flowchart LR');

    closeFullscreen();
    unsubA();
    unsubB();
  });

  it('delivers the current state on subscribe, so late-mounting instances catch up', () => {
    openFullscreen('flowchart LR');

    const listener = jest.fn();
    const unsubscribe = subscribeFullscreen(listener);
    expect(listener).toHaveBeenCalledWith('flowchart LR');

    closeFullscreen();
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeFullscreen(listener);
    unsubscribe();
    listener.mockClear();

    openFullscreen('flowchart LR');
    expect(listener).not.toHaveBeenCalled();

    closeFullscreen();
  });

  it('drops open state once the last subscriber leaves, so a new page starts closed', () => {
    const first = jest.fn();
    const unsubFirst = subscribeFullscreen(first);
    openFullscreen('flowchart LR');
    unsubFirst();

    const next = jest.fn();
    const unsubNext = subscribeFullscreen(next);
    expect(next).toHaveBeenCalledWith(null);
    unsubNext();
  });

  it('is a no-op without subscribers', () => {
    expect(() => openFullscreen('flowchart LR')).not.toThrow();
    expect(() => closeFullscreen()).not.toThrow();
  });
});
