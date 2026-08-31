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

export interface EmbedOptions {
  theme?: BasedashTheme;
  hideOrgName?: boolean;
  hideChat?: boolean;
  hideDashboards?: boolean;
  hideInsights?: boolean;
  hideAutomations?: boolean;
  hideModels?: boolean;
  hideSuggestedPrompts?: boolean;
}

export interface BuildEmbedUrlOptions {
  token: string;
  options?: EmbedOptions;
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
   * Override this when embedding a self-hosted Basedash instance.
   *
   * @default "https://charts.basedash.com"
   */
  instanceUrl?: string;
}

export const DEFAULT_EMBED_OPTIONS = {
  theme: "auto",
  hideOrgName: false,
  hideChat: false,
  hideDashboards: false,
  hideInsights: false,
  hideAutomations: false,
  hideModels: false,
  hideSuggestedPrompts: false,
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
  instanceUrl = DEFAULT_BASEDASH_URL,
}: BuildEmbedUrlOptions): string {
  assertNonEmpty(token, "token");

  const url = createInstanceUrl(instanceUrl, "api/sso/jwt");
  const resolvedOptions: Required<EmbedOptions> = {
    theme: options?.theme ?? DEFAULT_EMBED_OPTIONS.theme,
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

  return url.toString();
}

export function buildSharedDashboardUrl({
  publicSharingLinkId,
  filterToken,
  instanceUrl = DEFAULT_BASEDASH_URL,
}: BuildSharedDashboardUrlOptions): string {
  assertNonEmpty(publicSharingLinkId, "publicSharingLinkId");

  const path = filterToken
    ? `shared/${encodeURIComponent(publicSharingLinkId)}/${encodeURIComponent(
        filterToken,
      )}`
    : `shared/${encodeURIComponent(publicSharingLinkId)}`;

  return createInstanceUrl(instanceUrl, path).toString();
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
