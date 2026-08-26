import { decodeJwt, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";

import {
  createDashboardFilterToken,
  createEmbedToken,
} from "../src/server";

const secret = "a-test-secret-that-never-leaves-the-server";
const secretKey = new TextEncoder().encode(secret);

describe("createEmbedToken", () => {
  it("creates an HS256 token with Basedash SSO claims", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createEmbedToken({
      secret,
      orgId: "org_123",
      user: {
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        role: "MEMBER",
        groups: ["Customer success"],
      },
    });
    const { payload, protectedHeader } = await jwtVerify(token, secretKey);

    expect(protectedHeader).toMatchObject({ alg: "HS256", typ: "JWT" });
    expect(payload).toMatchObject({
      email: "jane@example.com",
      orgId: "org_123",
      firstName: "Jane",
      lastName: "Doe",
      role: "MEMBER",
      groups: ["Customer success"],
    });
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.exp).toBe((payload.iat ?? 0) + 600);
  });

  it("accepts a numeric expiration duration in seconds", async () => {
    const token = await createEmbedToken({
      secret: secretKey,
      orgId: "org_123",
      user: { email: "jane@example.com" },
      expiresIn: 30,
    });
    const payload = decodeJwt(token);

    expect(payload.exp).toBe((payload.iat ?? 0) + 30);
  });

  it("rejects empty server credentials and identities", async () => {
    await expect(
      createEmbedToken({
        secret: "",
        orgId: "org_123",
        user: { email: "jane@example.com" },
      }),
    ).rejects.toThrow("secret must not be empty");

    await expect(
      createEmbedToken({
        secret,
        orgId: "",
        user: { email: "jane@example.com" },
      }),
    ).rejects.toThrow("orgId must not be empty");
  });
});

describe("createDashboardFilterToken", () => {
  it("creates a verified token containing locked dashboard filters", async () => {
    const token = await createDashboardFilterToken({
      secret,
      dashboardLinkId: "link_123",
      params: {
        company_id: "company_456",
        regions: ["us", "ca"],
        active: true,
        limit: 100,
      },
      expiresIn: "30m",
    });
    const { payload } = await jwtVerify(token, secretKey);

    expect(payload).toMatchObject({
      dashboardLinkId: "link_123",
      params: {
        company_id: "company_456",
        regions: ["us", "ca"],
        active: true,
        limit: 100,
      },
    });
    expect(payload.exp).toBe((payload.iat ?? 0) + 30 * 60);
  });

  it("rejects unsupported filter values", async () => {
    await expect(
      createDashboardFilterToken({
        secret,
        dashboardLinkId: "link_123",
        params: {
          invalid: Number.NaN,
        },
      }),
    ).rejects.toThrow("params.invalid");
  });
});
