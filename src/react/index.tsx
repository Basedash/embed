import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AUTOMATIONS_EMBED_OPTIONS,
  CHAT_EMBED_OPTIONS,
  DASHBOARDS_EMBED_OPTIONS,
  DEFAULT_BASEDASH_URL,
  INSIGHTS_EMBED_OPTIONS,
  MODELS_EMBED_OPTIONS,
  buildEmbedUrl,
  buildSharedDashboardUrl,
} from "../embed";

import type {
  CSSProperties,
  IframeHTMLAttributes,
  ReactNode,
} from "react";
import type {
  BasedashTheme,
  EmbedInitialPage,
  EmbedOptions,
} from "../embed";

export type FetchBasedashToken = () => Promise<string>;

export type BasedashTokenStatus = "loading" | "ready" | "error";

interface BasedashProviderCommonProps {
  children: ReactNode;
  /**
   * Override this when embedding a self-hosted Basedash instance.
   *
   * @default "https://charts.basedash.com"
   */
  instanceUrl?: string;
  /**
   * Default theme for authenticated embeds under this provider.
   *
   * @default "auto"
   */
  theme?: BasedashTheme;
}

export type BasedashProviderProps = BasedashProviderCommonProps &
  (
    | {
        /**
         * A short-lived token generated on your server.
         */
        token: string;
        fetchToken?: never;
      }
    | {
        token?: never;
        /**
         * Fetch a short-lived token from your backend. The embed secret must
         * never be sent to the browser.
         */
        fetchToken: FetchBasedashToken;
      }
  );

export interface BasedashContextValue {
  token: string | undefined;
  status: BasedashTokenStatus;
  error: Error | undefined;
  instanceUrl: string;
  theme: BasedashTheme;
  refreshToken: () => Promise<string>;
}

interface TokenState {
  token: string | undefined;
  status: BasedashTokenStatus;
  error: Error | undefined;
}

const BasedashContext = createContext<BasedashContextValue | null>(null);

export function BasedashProvider({
  children,
  token: tokenProp,
  fetchToken,
  instanceUrl = DEFAULT_BASEDASH_URL,
  theme = "auto",
}: BasedashProviderProps) {
  const fetchTokenRef = useRef(fetchToken);
  const hasFetchedRef = useRef(false);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<TokenState>(() =>
    tokenProp === undefined
      ? { token: undefined, status: "loading", error: undefined }
      : {
          token: validateToken(tokenProp),
          status: "ready",
          error: undefined,
        },
  );

  useEffect(() => {
    fetchTokenRef.current = fetchToken;
  }, [fetchToken]);

  const refreshToken = useCallback(async () => {
    if (tokenProp !== undefined) {
      const token = validateToken(tokenProp);
      setState({ token, status: "ready", error: undefined });
      return token;
    }

    const tokenLoader = fetchTokenRef.current;
    if (tokenLoader === undefined) {
      throw new Error(
        "BasedashProvider requires either token or fetchToken to be set",
      );
    }

    const requestId = ++requestIdRef.current;
    setState((current) => ({
      token: current.token,
      status: "loading",
      error: undefined,
    }));

    try {
      const token = validateToken(await tokenLoader());
      if (requestId === requestIdRef.current) {
        setState({ token, status: "ready", error: undefined });
      }
      return token;
    } catch (error) {
      const resolvedError = toError(error);
      if (requestId === requestIdRef.current) {
        setState({
          token: undefined,
          status: "error",
          error: resolvedError,
        });
      }
      throw resolvedError;
    }
  }, [tokenProp]);

  useEffect(() => {
    if (tokenProp !== undefined) {
      setState({
        token: validateToken(tokenProp),
        status: "ready",
        error: undefined,
      });
      hasFetchedRef.current = false;
      return;
    }

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void refreshToken().catch(() => {
        // The error is exposed through context and rendered by embed components.
      });
    }
  }, [refreshToken, tokenProp]);

  const value = useMemo<BasedashContextValue>(
    () => ({
      ...state,
      instanceUrl,
      theme,
      refreshToken,
    }),
    [instanceUrl, refreshToken, state, theme],
  );

  return (
    <BasedashContext.Provider value={value}>
      {children}
    </BasedashContext.Provider>
  );
}

export function useBasedash(): BasedashContextValue {
  const context = useContext(BasedashContext);
  if (context === null) {
    throw new Error("useBasedash must be used inside a BasedashProvider");
  }
  return context;
}

type IframeProps = Omit<
  IframeHTMLAttributes<HTMLIFrameElement>,
  "children" | "src" | "title"
>;

export interface BasedashFrameProps {
  /**
   * A class applied to the frame's outer container.
   */
  className?: string;
  /**
   * Styles applied to the frame's outer container.
   */
  style?: CSSProperties;
  /**
   * Props forwarded to the underlying iframe.
   */
  iframeProps?: IframeProps;
  /**
   * Content displayed over the iframe until its load event fires.
   */
  loadingFallback?: ReactNode;
  /**
   * Content displayed if fetching the token fails. A function receives the
   * original error.
   */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  title?: string;
}

interface AuthenticatedEmbedProps extends BasedashFrameProps {
  /**
   * A token generated on your server. When omitted, the nearest
   * BasedashProvider supplies the token.
   */
  token?: string;
  /**
   * Overrides the provider's instance URL.
   */
  instanceUrl?: string;
  /**
   * Overrides the provider's theme.
   */
  theme?: BasedashTheme;
  /**
   * Do not render the left sidebar at all, with no way to reopen it. Your app
   * then owns navigation.
   *
   * @default false
   */
  hideSidebar?: boolean;
}

export interface BasedashAppProps extends AuthenticatedEmbedProps {
  hideOrgName?: boolean;
  hideChat?: boolean;
  hideDashboards?: boolean;
  hideInsights?: boolean;
  hideAutomations?: boolean;
  hideModels?: boolean;
  hideSuggestedPrompts?: boolean;
  /**
   * The page the embed opens on. Users can still navigate elsewhere.
   */
  initialPage?: EmbedInitialPage;
}

export interface BasedashChatProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
  hideSuggestedPrompts?: boolean;
  /**
   * Open this chat instead of a new chat.
   */
  chatId?: string;
}

export interface BasedashDashboardsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
  /**
   * Open this dashboard instead of the dashboards home page.
   */
  dashboardId?: string;
}

export interface BasedashInsightsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
  /**
   * Open this insight instead of the insights feed.
   */
  insightId?: string;
}

export interface BasedashAutomationsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
  /**
   * Open this automation instead of the automations list.
   */
  automationId?: string;
}

export interface BasedashModelsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
  /**
   * Open this model instead of the models list.
   */
  modelId?: string;
}

export interface BasedashSharedDashboardProps extends BasedashFrameProps {
  publicSharingLinkId: string;
  /**
   * A token created with `createDashboardFilterToken`.
   */
  filterToken?: string;
  instanceUrl?: string;
}

export const BasedashApp = forwardRef<HTMLIFrameElement, BasedashAppProps>(
  function BasedashApp(
    {
      token,
      instanceUrl,
      theme,
      hideOrgName,
      hideChat,
      hideDashboards,
      hideInsights,
      hideAutomations,
      hideModels,
      hideSuggestedPrompts,
      hideSidebar,
      initialPage,
      title = "Basedash",
      ...frameProps
    },
    ref,
  ) {
    return (
      <AuthenticatedBasedashFrame
        ref={ref}
        token={token}
        instanceUrl={instanceUrl}
        initialPage={initialPage}
        options={{
          theme,
          hideOrgName,
          hideChat,
          hideDashboards,
          hideInsights,
          hideAutomations,
          hideModels,
          hideSuggestedPrompts,
          hideSidebar,
        }}
        title={title}
        {...frameProps}
      />
    );
  },
);

export const BasedashChat = forwardRef<HTMLIFrameElement, BasedashChatProps>(
  function BasedashChat(
    {
      token,
      instanceUrl,
      theme,
      hideOrgName,
      hideSuggestedPrompts,
      hideSidebar,
      chatId,
      title = "Basedash chat",
      ...frameProps
    },
    ref,
  ) {
    return (
      <AuthenticatedBasedashFrame
        ref={ref}
        token={token}
        instanceUrl={instanceUrl}
        initialPage={toInitialPage("chat", chatId)}
        options={{
          ...CHAT_EMBED_OPTIONS,
          theme: theme ?? CHAT_EMBED_OPTIONS.theme,
          hideOrgName: hideOrgName ?? CHAT_EMBED_OPTIONS.hideOrgName,
          hideSuggestedPrompts:
            hideSuggestedPrompts ??
            CHAT_EMBED_OPTIONS.hideSuggestedPrompts,
          hideSidebar: hideSidebar ?? CHAT_EMBED_OPTIONS.hideSidebar,
        }}
        title={title}
        {...frameProps}
      />
    );
  },
);

export const BasedashDashboards = forwardRef<
  HTMLIFrameElement,
  BasedashDashboardsProps
>(function BasedashDashboards(
  {
    token,
    instanceUrl,
    theme,
    hideOrgName,
    hideSidebar,
    dashboardId,
    title = "Basedash dashboards",
    ...frameProps
  },
  ref,
) {
  return (
    <AuthenticatedBasedashFrame
      ref={ref}
      token={token}
      instanceUrl={instanceUrl}
      initialPage={toInitialPage("dashboard", dashboardId)}
      options={{
        ...DASHBOARDS_EMBED_OPTIONS,
        theme: theme ?? DASHBOARDS_EMBED_OPTIONS.theme,
        hideSidebar: hideSidebar ?? DASHBOARDS_EMBED_OPTIONS.hideSidebar,
        hideOrgName: hideOrgName ?? DASHBOARDS_EMBED_OPTIONS.hideOrgName,
      }}
      title={title}
      {...frameProps}
    />
  );
});

export const BasedashInsights = forwardRef<
  HTMLIFrameElement,
  BasedashInsightsProps
>(function BasedashInsights(
  {
    token,
    instanceUrl,
    theme,
    hideOrgName,
    hideSidebar,
    insightId,
    title = "Basedash insights",
    ...frameProps
  },
  ref,
) {
  return (
    <AuthenticatedBasedashFrame
      ref={ref}
      token={token}
      instanceUrl={instanceUrl}
      initialPage={toInitialPage("insight", insightId)}
      options={{
        ...INSIGHTS_EMBED_OPTIONS,
        theme: theme ?? INSIGHTS_EMBED_OPTIONS.theme,
        hideSidebar: hideSidebar ?? INSIGHTS_EMBED_OPTIONS.hideSidebar,
        hideOrgName: hideOrgName ?? INSIGHTS_EMBED_OPTIONS.hideOrgName,
      }}
      title={title}
      {...frameProps}
    />
  );
});

export const BasedashAutomations = forwardRef<
  HTMLIFrameElement,
  BasedashAutomationsProps
>(function BasedashAutomations(
  {
    token,
    instanceUrl,
    theme,
    hideOrgName,
    hideSidebar,
    automationId,
    title = "Basedash automations",
    ...frameProps
  },
  ref,
) {
  return (
    <AuthenticatedBasedashFrame
      ref={ref}
      token={token}
      instanceUrl={instanceUrl}
      initialPage={toInitialPage("automation", automationId)}
      options={{
        ...AUTOMATIONS_EMBED_OPTIONS,
        theme: theme ?? AUTOMATIONS_EMBED_OPTIONS.theme,
        hideSidebar: hideSidebar ?? AUTOMATIONS_EMBED_OPTIONS.hideSidebar,
        hideOrgName:
          hideOrgName ?? AUTOMATIONS_EMBED_OPTIONS.hideOrgName,
      }}
      title={title}
      {...frameProps}
    />
  );
});

export const BasedashModels = forwardRef<
  HTMLIFrameElement,
  BasedashModelsProps
>(function BasedashModels(
  {
    token,
    instanceUrl,
    theme,
    hideOrgName,
    hideSidebar,
    modelId,
    title = "Basedash models",
    ...frameProps
  },
  ref,
) {
  return (
    <AuthenticatedBasedashFrame
      ref={ref}
      token={token}
      instanceUrl={instanceUrl}
      initialPage={toInitialPage("model", modelId)}
      options={{
        ...MODELS_EMBED_OPTIONS,
        theme: theme ?? MODELS_EMBED_OPTIONS.theme,
        hideSidebar: hideSidebar ?? MODELS_EMBED_OPTIONS.hideSidebar,
        hideOrgName: hideOrgName ?? MODELS_EMBED_OPTIONS.hideOrgName,
      }}
      title={title}
      {...frameProps}
    />
  );
});

export const BasedashSharedDashboard = forwardRef<
  HTMLIFrameElement,
  BasedashSharedDashboardProps
>(function BasedashSharedDashboard(
  {
    publicSharingLinkId,
    filterToken,
    instanceUrl,
    title = "Basedash dashboard",
    ...frameProps
  },
  ref,
) {
  const src = buildSharedDashboardUrl({
    publicSharingLinkId,
    filterToken,
    instanceUrl,
  });

  return <BasedashFrame ref={ref} src={src} title={title} {...frameProps} />;
});

interface AuthenticatedBasedashFrameProps extends BasedashFrameProps {
  token: string | undefined;
  instanceUrl: string | undefined;
  options: EmbedOptions;
  initialPage: EmbedInitialPage | undefined;
}

interface CommittedFrame {
  src: string;
  token: string;
  configKey: string;
}

const AuthenticatedBasedashFrame = forwardRef<
  HTMLIFrameElement,
  AuthenticatedBasedashFrameProps
>(function AuthenticatedBasedashFrame(
  {
    token: tokenProp,
    instanceUrl: instanceUrlProp,
    options,
    initialPage,
    errorFallback,
    ...frameProps
  },
  ref,
) {
  const context = useContext(BasedashContext);
  const token = tokenProp ?? context?.token;
  const instanceUrl =
    instanceUrlProp ?? context?.instanceUrl ?? DEFAULT_BASEDASH_URL;
  const resolvedOptions: EmbedOptions = {
    ...options,
    theme: options.theme ?? context?.theme ?? "auto",
  };
  const configKey = JSON.stringify([
    instanceUrl,
    resolvedOptions,
    initialPage ?? null,
  ]);
  const nextSrc =
    token === undefined
      ? undefined
      : buildEmbedUrl({
          token,
          instanceUrl,
          options: resolvedOptions,
          initialPage,
        });

  const [committed, setCommitted] = useState<CommittedFrame | null>(null);
  const refreshingConfigKeyRef = useRef<string | null>(null);
  const refreshToken = context?.refreshToken;

  useEffect(() => {
    if (token === undefined || nextSrc === undefined) return;

    if (committed === null || committed.configKey === configKey) {
      if (committed?.src !== nextSrc) {
        setCommitted({ src: nextSrc, token, configKey });
      }
      return;
    }

    // A new URL re-runs the JWT SSO handshake in the iframe. Provider tokens
    // are short-lived, so fetch a fresh one rather than replaying a token that
    // may have expired since the provider mounted. A token passed as a prop is
    // the caller's responsibility to keep fresh.
    if (tokenProp !== undefined || refreshToken === undefined) {
      setCommitted({ src: nextSrc, token, configKey });
      return;
    }
    if (refreshingConfigKeyRef.current === configKey) return;

    refreshingConfigKeyRef.current = configKey;
    const pendingOptions = { instanceUrl, options: resolvedOptions, initialPage };
    refreshToken().then(
      (freshToken) => {
        if (refreshingConfigKeyRef.current !== configKey) return;
        refreshingConfigKeyRef.current = null;
        setCommitted({
          src: buildEmbedUrl({ token: freshToken, ...pendingOptions }),
          token: freshToken,
          configKey,
        });
      },
      () => {
        // The provider exposes the error, which renders errorFallback below.
        if (refreshingConfigKeyRef.current === configKey) {
          refreshingConfigKeyRef.current = null;
        }
      },
    );
    // resolvedOptions and initialPage are new objects every render; configKey
    // is their stable identity.
  }, [committed, configKey, nextSrc, refreshToken, token, tokenProp]);

  if (token === undefined) {
    if (context === null) {
      throw new Error(
        "Authenticated Basedash embeds require a token prop or BasedashProvider",
      );
    }

    if (context.status === "error" && context.error !== undefined) {
      if (errorFallback === undefined) {
        throw context.error;
      }

      return (
        <>
          {typeof errorFallback === "function"
            ? errorFallback(context.error)
            : errorFallback}
        </>
      );
    }

    return <>{frameProps.loadingFallback ?? null}</>;
  }

  // While a fresh token is fetched for a new URL, keep showing the current
  // page instead of loading the new one with a possibly expired token.
  const src = committed?.src ?? nextSrc ?? "";

  return <BasedashFrame ref={ref} src={src} {...frameProps} />;
});

function toInitialPage(
  type: EmbedInitialPage["type"],
  id: string | undefined,
): EmbedInitialPage | undefined {
  return id ? { type, id } : undefined;
}

interface InternalBasedashFrameProps extends BasedashFrameProps {
  src: string;
}

const BasedashFrame = forwardRef<
  HTMLIFrameElement,
  InternalBasedashFrameProps
>(function BasedashFrame(
  {
    src,
    className,
    style,
    iframeProps,
    loadingFallback,
    title = "Basedash",
  },
  ref,
) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {!loaded && loadingFallback !== undefined ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          {loadingFallback}
        </div>
      ) : null}
      <iframe
        {...iframeProps}
        ref={ref}
        src={src}
        title={title}
        allow={iframeProps?.allow ?? "clipboard-write"}
        loading={iframeProps?.loading ?? "eager"}
        onLoad={(event) => {
          setLoaded(true);
          iframeProps?.onLoad?.(event);
        }}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          ...iframeProps?.style,
        }}
      />
    </div>
  );
});

function validateToken(token: string): string {
  if (token.trim().length === 0) {
    throw new TypeError("Basedash token must not be empty");
  }
  return token;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
