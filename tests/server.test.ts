import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("signs the view-only VIEWER role", async () => {
    const token = await createEmbedToken({
      secret,
      orgId: "org_123",
      user: { email: "jane@example.com", role: "VIEWER" },
    });
    const { payload } = await jwtVerify(token, secretKey);

    expect(payload.role).toBe("VIEWER");
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

  describe("values Basedash would render into SQL unsafely", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const dangerousValues: Array<[string, string | string[]]> = [
      ["single quote", "x' OR '1'='1"],
      ["double quote", 'x" OR "1"="1'],
      ["backtick", "x` OR 1=1"],
      ["backslash", "x\\' OR 1=1"],
      ["semicolon", "x; DROP TABLE users"],
      ["line comment", "1 OR 1=1 --"],
      ["block comment", "1 /* comment"],
      ["quote inside an array item", ["us", "ca') OR ('1'='1"]],
    ];

    it.each(dangerousValues)(
      "rejects a %s before signing",
      async (_name, value) => {
        const sign = vi.spyOn(SignJWT.prototype, "sign");

        const result = createDashboardFilterToken({
          secret,
          dashboardLinkId: "link_123",
          params: { company: value },
        });

        await expect(result).rejects.toThrow(TypeError);
        await expect(result).rejects.toThrow(
          "params.company must not contain ' \" ` \\ ; -- /*",
        );
        expect(sign).not.toHaveBeenCalled();
      },
    );

    it("leaves the rejected value out of the error message", async () => {
      const value = "acme' UNION SELECT secret FROM vault --";

      const error = await createDashboardFilterToken({
        secret,
        dashboardLinkId: "link_123",
        params: { company: value },
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(TypeError);
      expect((error as TypeError).message).not.toContain("UNION");
      expect((error as TypeError).message).not.toContain(secret);
    });

    it("checks arrays as Basedash renders them, joined with commas", async () => {
      const token = await createDashboardFilterToken({
        secret,
        dashboardLinkId: "link_123",
        params: { ranges: ["a-", "-b", "c/", "*d"] },
      });
      const { payload } = await jwtVerify(token, secretKey);

      expect(payload.params).toEqual({ ranges: ["a-", "-b", "c/", "*d"] });
    });

    it("accepts typical identifiers, dates, and numbers", async () => {
      const params = {
        company_id: "6f1c2a7e-3b9d-4c1e-9f2a-7b8c9d0e1f2a",
        email: "jane.doe+billing@example.com",
        start: "2024-01-31T12:00:00.000Z",
        label: "Acme, Inc. (EMEA) 50% / Q1*",
        empty: "",
        regions: ["us-east-1", "eu-west-1"],
        offset: -1.5e-7,
        active: false,
      };

      const token = await createDashboardFilterToken({
        secret,
        dashboardLinkId: "link_123",
        params,
      });
      const { payload } = await jwtVerify(token, secretKey);

      expect(payload.params).toEqual(params);
    });
  });
});
