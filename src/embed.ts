export const DEFAULT_BASEDASH_URL = "https://charts.basedash.com";

export const EMBED_QUERY_PARAMS = {
  theme: "theme",
  hideOrgName: "hide_org_name",
  hideChat: "hide_chat",
  hideDashboards: "hide_dashboards",
  hideInsights: "hide_insights",
  hideAutomations: "hide_automations",
  hideModels: "hide_models",
  hideSuggestedPrompts: "hide_suggested_prompts",
  hideSidebar: "hide_sidebar",
  radius: "radius",
  colorBackground: "color_background",
  colorSidebarBackground: "color_sidebar_background",
  colorForeground: "color_foreground",
  colorAccent: "color_accent",
  colorChart: "color_chart",
} as const;

/** `color_background=default` clears custom colors for the iframe session. */
const DEFAULT_COLORS_PARAM_VALUE = "default";

/** The number of chart color slots, in the order listed on `EmbedColors.chart`. */
export const EMBED_CHART_COLOR_COUNT = 9;

/**
 * Query parameters that choose the page an embed opens on. Unlike
 * `EMBED_QUERY_PARAMS`, they are not remembered for the iframe session.
 */
export const INITIAL_PAGE_QUERY_PARAMS = {
  chat: "chat_id",
  dashboard: "dashboard_id",
  insight: "insight_id",
  automation: "automation_id",
  model: "model_id",
} as const;

export type BasedashTheme = "light" | "dark" | "auto";

export type BasedashRole = "ADMIN" | "MEMBER";

export interface EmbedUser {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: BasedashRole;
  /**
   * Reserved for future group synchronization support in Basedash.
   */
  groups?: string[];
}

/**
 * Custom colors for the embed, as 3- or 6-digit hex values (`#` optional).
 * Basedash derives every other shade (borders, secondary text, hover and
 * elevated surfaces) from these, so the palette stays consistent.
 */
export interface EmbedColors {
  /**
   * Page and card background. Light or dark mode follows this color, and it
   * takes precedence over `theme`.
   */
  background: string;
  /**
   * Sidebar and app frame background.
   *
   * @default a shade of `background`
   */
  sidebarBackground?: string;
  /**
   * Text and icon color.
   *
   * @default near-white on dark backgrounds, near-black on light ones
   */
  foreground?: string;
  /**
   * Links, selection, focus rings, and the accent color in charts. Primary
   * buttons keep Basedash's colors.
   */
  accent?: string;
  /**
   * Up to nine chart colors, filling these slots in order: neutral, blue,
   * orange, purple, red, teal, green, yellow, pink. Slots you leave out keep
   * Basedash's defaults. Basedash AI picks chart colors by slot name, so keep
   * each slot's meaning (for example, pass a blue as the second color).
   */
  chart?: string[];
}

/** Scales the corner radius of cards, buttons, inputs, and dialogs. */
export type EmbedRadius = "none" | "small" | "default" | "large";

export interface EmbedOptions {
  theme?: BasedashTheme;
  /**
   * Custom colors. `null` uses Basedash's colors for `theme`.
   */
  colors?: EmbedColors | null;
  /**
   * @default "default"
   */
  radius?: EmbedRadius;
  hideOrgName?: boolean;
  hideChat?: boolean;
  hideDashboards?: boolean;
  hideInsights?: boolean;
  hideAutomations?: boolean;
  hideModels?: boolean;
  hideSuggestedPrompts?: boolean;
  /**
   * Do not render the left sidebar at all, with no way to reopen it. Your app
   * then owns navigation, so pair this with a single visible feature and, for
   * dashboards, an initial page.
   */
  hideSidebar?: boolean;
}

export type EmbedInitialPageType = keyof typeof INITIAL_PAGE_QUERY_PARAMS;

/**
 * The page an embed opens on. This only chooses where the embed starts: users
 * can still navigate elsewhere. Basedash ignores it and opens the default page
 * when the page's feature is hidden or disabled.
 */
export interface EmbedInitialPage {
  type: EmbedInitialPageType;
  id: string;
}

export interface BuildEmbedUrlOptions {
  token: string;
  options?: EmbedOptions;
  initialPage?: EmbedInitialPage;
  /**
   * Override this when embedding a self-hosted Basedash instance.
   *
   * @default "https://charts.basedash.com"
   */
  instanceUrl?: string;
}

export interface BuildSharedDashboardUrlOptions {
  publicSharingLinkId: string;
  /**
   * A token created with `createDashboardFilterToken` from
   * `@basedash/embed/server`.
   */
  filterToken?: string;
  /**
   * Custom colors, applied when the dashboard is embedded in an iframe.
   * Setting `colors` or `radius` emits both. In an iframe, always set
   * `colors` (`null` for Basedash's colors): Basedash remembers them for the
   * iframe session, so a URL without them keeps the previous colors.
   */
  colors?: EmbedColors | null;
  /**
   * @default "default"
   */
  radius?: EmbedRadius;
  /**
   * Override this when embedding a self-hosted Basedash instance.
   *
   * @default "https://charts.basedash.com"
   */
  instanceUrl?: string;
}

export const DEFAULT_EMBED_OPTIONS = {
  theme: "auto",
  colors: null,
  radius: "default",
  hideOrgName: false,
  hideChat: false,
  hideDashboards: false,
  hideInsights: false,
  hideAutomations: false,
  hideModels: false,
  hideSuggestedPrompts: false,
  hideSidebar: false,
} as const satisfies Required<EmbedOptions>;

export const CHAT_EMBED_OPTIONS = {
  ...DEFAULT_EMBED_OPTIONS,
  hideOrgName: true,
  hideDashboards: true,
  hideInsights: true,
  hideAutomations: true,
  hideModels: true,
} as const satisfies Required<EmbedOptions>;

export const DASHBOARDS_EMBED_OPTIONS = {
  ...DEFAULT_EMBED_OPTIONS,
  hideOrgName: true,
  hideChat: true,
  hideInsights: true,
  hideAutomations: true,
  hideModels: true,
} as const satisfies Required<EmbedOptions>;

export const INSIGHTS_EMBED_OPTIONS = {
  ...DEFAULT_EMBED_OPTIONS,
  hideOrgName: true,
  hideChat: true,
  hideDashboards: true,
  hideAutomations: true,
  hideModels: true,
} as const satisfies Required<EmbedOptions>;

export const AUTOMATIONS_EMBED_OPTIONS = {
  ...DEFAULT_EMBED_OPTIONS,
  hideOrgName: true,
  hideChat: true,
  hideDashboards: true,
  hideInsights: true,
  hideModels: true,
} as const satisfies Required<EmbedOptions>;

export const MODELS_EMBED_OPTIONS = {
  ...DEFAULT_EMBED_OPTIONS,
  hideOrgName: true,
  hideChat: true,
  hideDashboards: true,
  hideInsights: true,
  hideAutomations: true,
} as const satisfies Required<EmbedOptions>;

export function buildEmbedUrl({
  token,
  options,
  initialPage,
  instanceUrl = DEFAULT_BASEDASH_URL,
}: BuildEmbedUrlOptions): string {
  assertNonEmpty(token, "token");
  if (initialPage !== undefined) {
    assertNonEmpty(initialPage.id, "initialPage.id");
  }

  const url = createInstanceUrl(instanceUrl, "api/sso/jwt");
  const resolvedOptions: Required<EmbedOptions> = {
    theme: options?.theme ?? DEFAULT_EMBED_OPTIONS.theme,
    colors: options?.colors ?? DEFAULT_EMBED_OPTIONS.colors,
    radius: options?.radius ?? DEFAULT_EMBED_OPTIONS.radius,
    hideOrgName:
      options?.hideOrgName ?? DEFAULT_EMBED_OPTIONS.hideOrgName,
    hideChat: options?.hideChat ?? DEFAULT_EMBED_OPTIONS.hideChat,
    hideDashboards:
      options?.hideDashboards ?? DEFAULT_EMBED_OPTIONS.hideDashboards,
    hideInsights:
      options?.hideInsights ?? DEFAULT_EMBED_OPTIONS.hideInsights,
    hideAutomations:
      options?.hideAutomations ?? DEFAULT_EMBED_OPTIONS.hideAutomations,
    hideModels: options?.hideModels ?? DEFAULT_EMBED_OPTIONS.hideModels,
    hideSuggestedPrompts:
      options?.hideSuggestedPrompts ??
      DEFAULT_EMBED_OPTIONS.hideSuggestedPrompts,
    hideSidebar: options?.hideSidebar ?? DEFAULT_EMBED_OPTIONS.hideSidebar,
  };

  url.searchParams.set("jwt", token);
  url.searchParams.set(EMBED_QUERY_PARAMS.theme, resolvedOptions.theme);
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideOrgName,
    String(resolvedOptions.hideOrgName),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideChat,
    String(resolvedOptions.hideChat),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideDashboards,
    String(resolvedOptions.hideDashboards),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideInsights,
    String(resolvedOptions.hideInsights),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideAutomations,
    String(resolvedOptions.hideAutomations),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideModels,
    String(resolvedOptions.hideModels),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideSuggestedPrompts,
    String(resolvedOptions.hideSuggestedPrompts),
  );
  url.searchParams.set(
    EMBED_QUERY_PARAMS.hideSidebar,
    String(resolvedOptions.hideSidebar),
  );
  setAppearanceParams(url, resolvedOptions);
  if (initialPage !== undefined) {
    url.searchParams.set(
      INITIAL_PAGE_QUERY_PARAMS[initialPage.type],
      initialPage.id,
    );
  }

  return url.toString();
}

export function buildSharedDashboardUrl({
  publicSharingLinkId,
  filterToken,
  colors,
  radius,
  instanceUrl = DEFAULT_BASEDASH_URL,
}: BuildSharedDashboardUrlOptions): string {
  assertNonEmpty(publicSharingLinkId, "publicSharingLinkId");

  const path = filterToken
    ? `shared/${encodeURIComponent(publicSharingLinkId)}/${encodeURIComponent(
        filterToken,
      )}`
    : `shared/${encodeURIComponent(publicSharingLinkId)}`;

  const url = createInstanceUrl(instanceUrl, path);
  // Plain share links stay clean; an iframe should pass both (see
  // setAppearanceParams) so removed colors don't linger in the session.
  if (colors !== undefined || radius !== undefined) {
    setAppearanceParams(url, {
      colors: colors ?? DEFAULT_EMBED_OPTIONS.colors,
      radius: radius ?? DEFAULT_EMBED_OPTIONS.radius,
    });
  }
  return url.toString();
}

/**
 * Basedash remembers colors and radius for the iframe session, so both are
 * always emitted: an embed that stops passing colors resets them instead of
 * keeping the previous ones. Basedash replaces colors as a set, so optional
 * colors are only emitted when set.
 */
function setAppearanceParams(
  url: URL,
  {
    colors,
    radius,
  }: { colors: EmbedColors | null; radius: EmbedRadius },
): void {
  url.searchParams.set(EMBED_QUERY_PARAMS.radius, radius);
  if (colors === null) {
    url.searchParams.set(
      EMBED_QUERY_PARAMS.colorBackground,
      DEFAULT_COLORS_PARAM_VALUE,
    );
    return;
  }

  url.searchParams.set(
    EMBED_QUERY_PARAMS.colorBackground,
    toHexParam(colors.background, "colors.background"),
  );
  const optionalColors = [
    [
      EMBED_QUERY_PARAMS.colorSidebarBackground,
      colors.sidebarBackground,
      "sidebarBackground",
    ],
    [EMBED_QUERY_PARAMS.colorForeground, colors.foreground, "foreground"],
    [EMBED_QUERY_PARAMS.colorAccent, colors.accent, "accent"],
  ] as const;
  for (const [param, value, name] of optionalColors) {
    if (value !== undefined) {
      url.searchParams.set(param, toHexParam(value, `colors.${name}`));
    }
  }
  if (colors.chart !== undefined && colors.chart.length > 0) {
    if (colors.chart.length > EMBED_CHART_COLOR_COUNT) {
      throw new TypeError(
        `colors.chart accepts at most ${EMBED_CHART_COLOR_COUNT} colors`,
      );
    }
    url.searchParams.set(
      EMBED_QUERY_PARAMS.colorChart,
      colors.chart
        .map((color, index) => toHexParam(color, `colors.chart[${index}]`))
        .join(","),
    );
  }
}

const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalizes to 6 lowercase digits without `#`, which needs no URL encoding. */
function toHexParam(value: string, name: string): string {
  const digits = HEX_COLOR_PATTERN.exec(value.trim())?.[1]?.toLowerCase();
  if (digits === undefined) {
    throw new TypeError(`${name} must be a hex color like #1a2b3c: ${value}`);
  }
  return digits.length === 3
    ? [...digits].map((digit) => `${digit}${digit}`).join("")
    : digits;
}

function createInstanceUrl(instanceUrl: string, path: string): URL {
  let baseUrl: URL;

  try {
    baseUrl = new URL(instanceUrl);
  } catch {
    throw new TypeError(`instanceUrl must be a valid URL: ${instanceUrl}`);
  }

  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new TypeError("instanceUrl must use http or https");
  }

  baseUrl.search = "";
  baseUrl.hash = "";
  if (!baseUrl.pathname.endsWith("/")) {
    baseUrl.pathname += "/";
  }

  return new URL(path, baseUrl);
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }
}
