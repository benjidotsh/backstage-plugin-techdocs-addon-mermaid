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
 * and the currently mounted MermaidAddon instance.
 *
 * The addon component can unmount and remount (e.g. on the entity docs
 * page) while the shadow DOM — including the injected buttons and their
 * click listeners — persists. A button that captured a state setter
 * directly would keep pointing at a dead instance, so clicks route through
 * this module-level registration instead: the live instance registers its
 * handler on mount, and buttons always dispatch to the latest one.
 */

type FullscreenHandler = (diagramText: string) => void;

let currentHandler: FullscreenHandler | null = null;

/**
 * Registers the handler for fullscreen requests, replacing any previous
 * one. Returns an unregister function that only clears the registration if
 * this handler is still the current one (a newer registration wins).
 */
export const registerFullscreenHandler = (handler: FullscreenHandler) => {
  currentHandler = handler;
  return () => {
    if (currentHandler === handler) {
      currentHandler = null;
    }
  };
};

/**
 * Dispatches a fullscreen request to the currently registered handler, if
 * any. Called by the buttons injected next to each diagram.
 */
export const openFullscreen = (diagramText: string) => {
  currentHandler?.(diagramText);
};
