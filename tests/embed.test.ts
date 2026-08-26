import { describe, expect, it } from "vitest";

import {
  AUTOMATIONS_EMBED_OPTIONS,
  CHAT_EMBED_OPTIONS,
  DASHBOARDS_EMBED_OPTIONS,
  DEFAULT_BASEDASH_URL,
  INSIGHTS_EMBED_OPTIONS,
  buildEmbedUrl,
  buildSharedDashboardUrl,
} from "../src";

describe("buildEmbedUrl", () => {
  it("builds a deterministic full-app SSO URL", () => {
    const result = new URL(buildEmbedUrl({ token: "header.payload.signature" }));

    expect(result.origin).toBe(DEFAULT_BASEDASH_URL);
    expect(result.pathname).toBe("/api/sso/jwt");
    expect(Object.fromEntries(result.searchParams)).toEqual({
      jwt: "header.payload.signature",
      theme: "auto",
      hide_org_name: "false",
      hide_chat: "false",
      hide_dashboards: "false",
      hide_insights: "false",
      hide_automations: "false",
      hide_suggested_prompts: "false",
    });
  });

  it("serializes custom options and a self-hosted base path", () => {
    const result = new URL(
      buildEmbedUrl({
        token: "token",
        instanceUrl: "https://analytics.example.com/basedash",
        options: {
          theme: "dark",
          hideChat: true,
          hideOrgName: true,
        },
      }),
    );

    expect(result.pathname).toBe("/basedash/api/sso/jwt");
    expect(result.searchParams.get("theme")).toBe("dark");
    expect(result.searchParams.get("hide_chat")).toBe("true");
    expect(result.searchParams.get("hide_org_name")).toBe("true");
    expect(result.searchParams.get("hide_dashboards")).toBe("false");
  });

  it("exports feature presets that leave exactly one feature visible", () => {
    expect(CHAT_EMBED_OPTIONS).toMatchObject({
      hideChat: false,
      hideDashboards: true,
      hideInsights: true,
      hideAutomations: true,
    });
    expect(DASHBOARDS_EMBED_OPTIONS).toMatchObject({
      hideChat: true,
      hideDashboards: false,
      hideInsights: true,
      hideAutomations: true,
    });
    expect(INSIGHTS_EMBED_OPTIONS).toMatchObject({
      hideChat: true,
      hideDashboards: true,
      hideInsights: false,
      hideAutomations: true,
    });
    expect(AUTOMATIONS_EMBED_OPTIONS).toMatchObject({
      hideChat: true,
      hideDashboards: true,
      hideInsights: true,
      hideAutomations: false,
    });
  });

  it("rejects missing tokens and unsupported URL protocols", () => {
    expect(() => buildEmbedUrl({ token: " " })).toThrow(
      "token must not be empty",
    );
    expect(() =>
      buildEmbedUrl({
        token: "token",
        instanceUrl: "file:///tmp/basedash",
      }),
    ).toThrow("instanceUrl must use http or https");
  });
});

describe("buildSharedDashboardUrl", () => {
  it("builds a public dashboard URL without authentication", () => {
    expect(
      buildSharedDashboardUrl({ publicSharingLinkId: "link_123" }),
    ).toBe("https://charts.basedash.com/shared/link_123");
  });

  it("adds a filter token and safely encodes path segments", () => {
    expect(
      buildSharedDashboardUrl({
        publicSharingLinkId: "customer/dashboard",
        filterToken: "header.payload/signature",
      }),
    ).toBe(
      "https://charts.basedash.com/shared/customer%2Fdashboard/header.payload%2Fsignature",
    );
  });
});
