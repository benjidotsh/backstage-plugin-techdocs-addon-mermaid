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

/**
 * Bridge between fullscreen buttons injected into the TechDocs shadow DOM
 * and the MermaidAddon instances that render the fullscreen dialog.
 *
 * TechDocs can mount several addon instances for the same content (and
 * remount them while the shadow DOM — including the injected buttons —
 * persists). On the entity docs page the addon renderer even mounts
 * duplicate instances whose React subtrees are unreliable: a state update
 * on one instance may never commit. Buttons therefore dispatch through
 * this module-level store, every mounted instance subscribes, and
 * whichever instance's subtree is actually live renders the dialog.
 */

type FullscreenListener = (diagramText: string | null) => void;

let currentDiagramText: string | null = null;
const listeners = new Set<FullscreenListener>();

/**
 * Subscribes to fullscreen open/close changes. The listener is invoked
 * immediately with the current state so late-mounting instances catch up.
 * Returns an unsubscribe function.
 */
export const subscribeFullscreen = (listener: FullscreenListener) => {
  listeners.add(listener);
  listener(currentDiagramText);
  return () => {
    listeners.delete(listener);
    // Once no instance is mounted (e.g. after navigating away), drop any
    // open state so a future page does not reopen a stale dialog.
    if (listeners.size === 0) {
      currentDiagramText = null;
    }
  };
};

/**
 * Opens the fullscreen dialog for the given diagram. Called by the buttons
 * injected next to each diagram.
 */
export const openFullscreen = (diagramText: string) => {
  currentDiagramText = diagramText;
  listeners.forEach(listener => listener(currentDiagramText));
};

/**
 * Closes the fullscreen dialog on every subscribed instance.
 */
export const closeFullscreen = () => {
  currentDiagramText = null;
  listeners.forEach(listener => listener(currentDiagramText));
};
