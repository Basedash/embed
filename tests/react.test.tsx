// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BasedashApp,
  BasedashAutomations,
  BasedashChat,
  BasedashDashboards,
  BasedashInsights,
  BasedashModels,
  BasedashProvider,
  BasedashSharedDashboard,
} from "../src/react";

afterEach(cleanup);

describe("authenticated React embeds", () => {
  it("renders a chat-only iframe with secure defaults", () => {
    const { getByTitle } = render(
      <BasedashChat token="header.payload.signature" />,
    );
    const iframe = getByTitle("Basedash chat");
    const src = new URL(iframe.getAttribute("src") ?? "");

    expect(iframe.getAttribute("allow")).toBe("clipboard-write");
    expect(iframe.getAttribute("loading")).toBe("eager");
    expect(src.searchParams.get("hide_org_name")).toBe("true");
    expect(src.searchParams.get("hide_chat")).toBe("false");
    expect(src.searchParams.get("hide_dashboards")).toBe("true");
    expect(src.searchParams.get("hide_insights")).toBe("true");
    expect(src.searchParams.get("hide_automations")).toBe("true");
    expect(src.searchParams.get("hide_models")).toBe("true");
  });

  it("renders a dashboards-only iframe and supports overrides", () => {
    const { getByTitle } = render(
      <BasedashDashboards
        token="token"
        hideOrgName={false}
        theme="dark"
      />,
    );
    const src = new URL(
      getByTitle("Basedash dashboards").getAttribute("src") ?? "",
    );

    expect(src.searchParams.get("theme")).toBe("dark");
    expect(src.searchParams.get("hide_org_name")).toBe("false");
    expect(src.searchParams.get("hide_chat")).toBe("true");
    expect(src.searchParams.get("hide_dashboards")).toBe("false");
  });

  it("renders an insights-only iframe", () => {
    const { getByTitle } = render(<BasedashInsights token="token" />);
    const src = new URL(
      getByTitle("Basedash insights").getAttribute("src") ?? "",
    );

    expect(src.searchParams.get("hide_chat")).toBe("true");
    expect(src.searchParams.get("hide_dashboards")).toBe("true");
    expect(src.searchParams.get("hide_insights")).toBe("false");
    expect(src.searchParams.get("hide_automations")).toBe("true");
    expect(src.searchParams.get("hide_models")).toBe("true");
  });

  it("renders an automations-only iframe", () => {
    const { getByTitle } = render(<BasedashAutomations token="token" />);
    const src = new URL(
      getByTitle("Basedash automations").getAttribute("src") ?? "",
    );

    expect(src.searchParams.get("hide_chat")).toBe("true");
    expect(src.searchParams.get("hide_dashboards")).toBe("true");
    expect(src.searchParams.get("hide_insights")).toBe("true");
    expect(src.searchParams.get("hide_automations")).toBe("false");
    expect(src.searchParams.get("hide_models")).toBe("true");
  });

  it("renders a models-only iframe", () => {
    const { getByTitle } = render(<BasedashModels token="token" />);
    const src = new URL(
      getByTitle("Basedash models").getAttribute("src") ?? "",
    );

    expect(src.searchParams.get("hide_chat")).toBe("true");
    expect(src.searchParams.get("hide_dashboards")).toBe("true");
    expect(src.searchParams.get("hide_insights")).toBe("true");
    expect(src.searchParams.get("hide_automations")).toBe("true");
    expect(src.searchParams.get("hide_models")).toBe("false");
  });

  it("fetches one token through BasedashProvider", async () => {
    const fetchToken = vi.fn().mockResolvedValue("provider-token");
    const { getByTitle } = render(
      <BasedashProvider fetchToken={fetchToken} theme="light">
        <BasedashApp />
      </BasedashProvider>,
    );

    await waitFor(() => {
      expect(getByTitle("Basedash")).toBeTruthy();
    });

    const src = new URL(getByTitle("Basedash").getAttribute("src") ?? "");
    expect(fetchToken).toHaveBeenCalledTimes(1);
    expect(src.searchParams.get("jwt")).toBe("provider-token");
    expect(src.searchParams.get("theme")).toBe("light");
    expect(src.searchParams.get("hide_chat")).toBe("false");
    expect(src.searchParams.get("hide_dashboards")).toBe("false");
  });

  it("renders a useful token error fallback", async () => {
    const { findByText } = render(
      <BasedashProvider
        fetchToken={async () => {
          throw new Error("Access denied");
        }}
      >
        <BasedashChat
          errorFallback={(error) => <p>Could not load: {error.message}</p>}
        />
      </BasedashProvider>,
    );

    expect(await findByText("Could not load: Access denied")).toBeTruthy();
  });

  it("shows a fallback until the iframe fires its load event", () => {
    const onLoad = vi.fn();
    const { getByText, getByTitle, queryByText } = render(
      <BasedashApp
        token="token"
        loadingFallback={<p>Loading analytics</p>}
        iframeProps={{ onLoad }}
      />,
    );

    expect(getByText("Loading analytics")).toBeTruthy();
    fireEvent.load(getByTitle("Basedash"));
    expect(queryByText("Loading analytics")).toBeNull();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});

describe("BasedashSharedDashboard", () => {
  it("renders without a provider and supports locked filter tokens", () => {
    const { getByTitle } = render(
      <BasedashSharedDashboard
        publicSharingLinkId="link_123"
        filterToken="filter.token"
      />,
    );

    expect(getByTitle("Basedash dashboard").getAttribute("src")).toBe(
      "https://charts.basedash.com/shared/link_123/filter.token",
    );
  });
});
