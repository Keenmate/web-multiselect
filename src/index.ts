// Import styles (produces the shipped dist/style.css via Vite)
import './css/main.css';

import { registerComponent } from '@keenmate/web-components-core';
import { MultiSelectElement } from './web-component';
import { logging } from './logger';

// Export the web component
export { MultiSelectElement };

// The dropdown engine, for standalone use only — element consumers use `el.controller`.
export { MultiSelectEngine } from './multiselect';

// data-options authoring formats (data-options-format)
export { parseOptionsData, OPTIONS_FORMATS } from './option-formats';
export { normalizeSearchText } from '@keenmate/web-components-core/search';
export type { OptionsFormat, ParsedOptions } from './option-formats';

// Device / viewport detection — re-exported from the core so consumers get the
// same "what device am I on" signal the component itself reacts to
// (environmentChanged), from ONE import surface and ONE dependency. Use it to
// drive per-device configuration (e.g. a different `actionButtons` set on mobile):
//   import { observeEnvironment, classifyDevice } from '@keenmate/web-multiselect';
//   observeEnvironment(env => { el.actionButtons = classifyDevice(env) === 'mobile' ? mobile : desktop; });
export {
  getEnvironment,
  observeEnvironment,
  observeViewport,
  classifyDevice,
  configureBreakpoints,
  TABLET_MIN_SHORT_SIDE,
} from '@keenmate/web-components-core';
// Theme context — re-exported from the core. Every Keenmate component on the page
// shares one detection (data-theme / data-bs-theme / .dark / .light on <html> or
// <body>, or a `theme-source` element); setThemeMode() forces all of them at once:
//   import { setThemeMode } from '@keenmate/web-multiselect';
//   setThemeMode('dark');   // 'light' | 'dark' | 'auto'
export {
  getThemeMode,
  setThemeMode,
  getThemeContext,
  observeThemeContext,
} from '@keenmate/web-components-core';
export type { ColorScheme, ThemeMode, ThemeSource } from '@keenmate/web-components-core';
export type {
  EnvironmentSnapshot,
  DeviceClass,
  Orientation,
  PointerType,
  OS,
  BreakpointMap,
} from '@keenmate/web-components-core';

// Export types
export type {
  MultiSelectOption,
  MultiSelectConfig,
  BadgesDisplayMode,
  BadgesPosition,
  BadgesThresholdMode,
  SearchInputMode,
  SearchMode,
  SearchBehavior,
  TabBehavior,
  SearchMatch,
  SearchTermContext,
  PreparedSearchTerm,
  SearchEntry,
  SearchCallbackContext,
  ValueFormat,
  MessageType,
  MessageOptions,
  MultiSelectContext,
  ItemContext,
  SelectedOrderCompareContext,
  TreeNodeContext,
  OptionContentRenderContext,
  BadgeContentRenderContext,
  GroupLabelRenderContext,
  SelectedContentRenderContext,
  CounterContext,
  CountLabelContext,
  ValueFormatContext,
  AddContext,
  BeforeSearchContext,
  SearchTermCallbackContext,
  MultiSelectSearchContext,
  SelectionSource,
  BeforeSelectContext,
  BeforeDeselectContext,
  KeydownContext,
  ActionContext,
  MultiSelectAction,
  MultiSelectActionItem,
  MultiSelectActionEventDetail,
  MultiSelectController,
  MultiSelectLabels,
  SelectEventDetail,
  DeselectEventDetail,
  ChangeEventDetail,
  ValueFormatErrorEventDetail,
  AddEventDetail,
  ReadyEventDetail,
  OpenEventDetail,
  CloseEventDetail,
} from './types';

// Export logging utilities for runtime control
export {
  setLogLevel,
  enableLogging,
  disableLogging,
  setCategoryLevel,
  LOGGING_CATEGORIES,
  initLogger,
  dataLogger,
  uiLogger,
  interactionLogger,
} from './logger';

// Type declarations for build-time constants
declare const __VERSION__: string;
declare const __PACKAGE_NAME__: string;
declare const __AUTHOR__: string;
declare const __LICENSE__: string;
declare const __REPOSITORY__: string;
declare const __HOMEPAGE__: string;

// The whole hand-rolled `window.components['web-multiselect'] = { … }` block —
// version/config/logging/register/getInstances — collapses to one core call.
// registerComponent defines the element, publishes build metadata + the flattened
// logging controls, and wires getInstances() to the live-instance registry that
// BlissElement maintains automatically (add on connect / remove on disconnect).
//
//   window.components['web-multiselect'].getInstances()
//   window.components['web-multiselect'].logging.enableLogging()
registerComponent('web-multiselect', MultiSelectElement as unknown as CustomElementConstructor, {
  config: {
    name: typeof __PACKAGE_NAME__ !== 'undefined' ? __PACKAGE_NAME__ : '@keenmate/web-multiselect',
    version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0',
    author: typeof __AUTHOR__ !== 'undefined' ? __AUTHOR__ : 'Keenmate s.r.o.',
    license: typeof __LICENSE__ !== 'undefined' ? __LICENSE__ : 'MIT',
    repository: typeof __REPOSITORY__ !== 'undefined' ? __REPOSITORY__ : '',
    homepage: typeof __HOMEPAGE__ !== 'undefined' ? __HOMEPAGE__ : '',
  },
  logging,
});

declare global {
  interface HTMLElementTagNameMap {
    'web-multiselect': MultiSelectElement;
  }
}
