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
  buildEmbedUrl,
  buildSharedDashboardUrl,
} from "../embed";

import type {
  CSSProperties,
  IframeHTMLAttributes,
  ReactNode,
} from "react";
import type { BasedashTheme, EmbedOptions } from "../embed";

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
}

export interface BasedashAppProps extends AuthenticatedEmbedProps {
  hideOrgName?: boolean;
  hideChat?: boolean;
  hideDashboards?: boolean;
  hideInsights?: boolean;
  hideAutomations?: boolean;
  hideSuggestedPrompts?: boolean;
}

export interface BasedashChatProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
  hideSuggestedPrompts?: boolean;
}

export interface BasedashDashboardsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
}

export interface BasedashInsightsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
}

export interface BasedashAutomationsProps extends AuthenticatedEmbedProps {
  /**
   * @default true
   */
  hideOrgName?: boolean;
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
      hideSuggestedPrompts,
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
        options={{
          theme,
          hideOrgName,
          hideChat,
          hideDashboards,
          hideInsights,
          hideAutomations,
          hideSuggestedPrompts,
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
        options={{
          ...CHAT_EMBED_OPTIONS,
          theme: theme ?? CHAT_EMBED_OPTIONS.theme,
          hideOrgName: hideOrgName ?? CHAT_EMBED_OPTIONS.hideOrgName,
          hideSuggestedPrompts:
            hideSuggestedPrompts ??
            CHAT_EMBED_OPTIONS.hideSuggestedPrompts,
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
      options={{
        ...DASHBOARDS_EMBED_OPTIONS,
        theme: theme ?? DASHBOARDS_EMBED_OPTIONS.theme,
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
      options={{
        ...INSIGHTS_EMBED_OPTIONS,
        theme: theme ?? INSIGHTS_EMBED_OPTIONS.theme,
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
      options={{
        ...AUTOMATIONS_EMBED_OPTIONS,
        theme: theme ?? AUTOMATIONS_EMBED_OPTIONS.theme,
        hideOrgName:
          hideOrgName ?? AUTOMATIONS_EMBED_OPTIONS.hideOrgName,
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
}

const AuthenticatedBasedashFrame = forwardRef<
  HTMLIFrameElement,
  AuthenticatedBasedashFrameProps
>(function AuthenticatedBasedashFrame(
  {
    token: tokenProp,
    instanceUrl: instanceUrlProp,
    options,
    errorFallback,
    ...frameProps
  },
  ref,
) {
  const context = useContext(BasedashContext);
  const token = tokenProp ?? context?.token;
  const instanceUrl =
    instanceUrlProp ?? context?.instanceUrl ?? DEFAULT_BASEDASH_URL;
  const theme = options.theme ?? context?.theme ?? "auto";

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

  const src = buildEmbedUrl({
    token,
    instanceUrl,
    options: {
      ...options,
      theme,
    },
  });

  return <BasedashFrame ref={ref} src={src} {...frameProps} />;
});

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
