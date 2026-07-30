/**
 * Stable performance mark names for Kairo (dev/profiling only).
 *
 * Use with `perfProbe.mark()` / `perfProbe.measure()` / `perfProbe.measureSince()`.
 * Never log private content — metadata only.
 */

/** Process / bundle lifecycle */
export const MARK_APP_START = 'app.start';
export const MARK_JS_BUNDLE_EXEC = 'app.jsBundle';
export const MARK_ROOT_MOUNT = 'app.rootMount';
export const MARK_PROVIDERS_READY = 'app.providersReady';
export const MARK_NAV_STATE_READY = 'nav.stateReady';
export const MARK_SPLASH_HIDE = 'app.splashHide';

/** Screen lifecycle */
export const MARK_SCREEN_FIRST_RENDER = (screen: string) => `screen.${screen}.firstRender`;
export const MARK_SCREEN_INTERACTIVE = (screen: string) => `screen.${screen}.interactive`;

/** Navigation */
export const MARK_TAB_PRESS = (tab: string) => `nav.tabPress.${tab}`;
export const MARK_NAV_DISPATCH = 'nav.dispatch';
export const MARK_NAV_STATE_CHANGED = 'nav.stateChanged';
export const MARK_SCREEN_FOCUSED = (screen: string) => `nav.focus.${screen}`;
export const MARK_SCREEN_COMMITTED = (screen: string) => `nav.committed.${screen}`;

/** Data */
export const MARK_SAVE_INITIATED = (domain: string) => `data.save.start.${domain}`;
export const MARK_SAVE_COMMITTED = (domain: string) => `data.save.done.${domain}`;
export const MARK_JOURNAL_LOADED = 'data.journal.loaded';
export const MARK_CALENDAR_LOADED = 'data.calendar.loaded';

/** App lifecycle */
export const MARK_APP_BACKGROUND = 'lifecycle.background';
export const MARK_APP_FOREGROUND = 'lifecycle.foreground';

/** Logger event names (structured perf.* lines in Metro logs). */
export const PerfMarks = {
  processStart: 'perf.processStart',
  appStart: 'perf.appStart',
  jsBundleReady: 'perf.jsBundleReady',
  rootMount: 'perf.rootMount',
  providersReady: 'perf.providersReady',
  navReady: 'perf.navReady',
  navStateChange: 'perf.navStateChange',
  navRouteChange: 'perf.navRouteChange',
  firstScreenRender: 'perf.firstScreenRender',
  firstScreenInteractive: 'perf.firstInteractionReady',
  tabPressReceived: 'perf.tabPressReceived',
  tabPressDispatched: 'perf.tabPressDispatched',
  tabPressToFocus: 'perf.tabPressToFocus',
  navToFocus: 'perf.navToFocus',
  screenFocus: 'perf.screenFocus',
  screenFirstFrame: 'perf.screenFirstFrame',
  screenDataReady: 'perf.screenDataReady',
  saveInitiated: 'perf.saveInitiated',
  saveCommitted: 'perf.saveCommitted',
  journalListLoaded: 'perf.journalListLoaded',
  calendarListLoaded: 'perf.calendarListLoaded',
  appBackgrounded: 'perf.appBackgrounded',
  appForegrounded: 'perf.appForegrounded',
  hitch: 'perf.hitch',
  report: 'perf.report',
  deviceInfo: 'perf.deviceInfo',
  longTask: 'perf.longTask',
} as const;

export type PerfMarkName = (typeof PerfMarks)[keyof typeof PerfMarks];
