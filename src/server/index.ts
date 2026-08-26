import { SignJWT } from "jose";

import type { BasedashRole, EmbedUser } from "../embed";

const ALGORITHM = "HS256";
const DEFAULT_EMBED_TOKEN_EXPIRATION = "10m";
const DEFAULT_DASHBOARD_TOKEN_EXPIRATION = "1h";

export type EmbedSecret = string | Uint8Array;

/**
 * A duration understood by `jose` (for example, `"10m"` or `"1h"`) or a
 * duration in seconds.
 */
export type TokenExpiration = string | number;

export type DashboardFilterValue = string | string[] | number | boolean;

export interface CreateEmbedTokenOptions {
  secret: EmbedSecret;
  orgId: string;
  user: EmbedUser;
  /**
   * @default "10m"
   */
  expiresIn?: TokenExpiration;
}

export interface CreateDashboardFilterTokenOptions {
  secret: EmbedSecret;
  dashboardLinkId: string;
  params: Record<string, DashboardFilterValue>;
  /**
   * @default "1h"
   */
  expiresIn?: TokenExpiration;
}

export interface EmbedTokenClaims {
  email: string;
  orgId: string;
  firstName?: string;
  lastName?: string;
  role?: BasedashRole;
  groups?: string[];
  iat: number;
  exp: number;
}

export interface DashboardFilterTokenClaims {
  dashboardLinkId: string;
  params: Record<string, DashboardFilterValue>;
  iat: number;
  exp: number;
}

/**
 * Creates the short-lived JWT used by full-app Basedash embeds.
 *
 * This function must only run on a trusted server. Never send the embed secret
 * to a browser.
 */
export async function createEmbedToken({
  secret,
  orgId,
  user,
  expiresIn = DEFAULT_EMBED_TOKEN_EXPIRATION,
}: CreateEmbedTokenOptions): Promise<string> {
  assertSecret(secret);
  assertNonEmpty(orgId, "orgId");
  assertNonEmpty(user.email, "user.email");
  assertExpiration(expiresIn);

  const payload = {
    email: user.email,
    orgId,
    ...(user.firstName === undefined ? {} : { firstName: user.firstName }),
    ...(user.lastName === undefined ? {} : { lastName: user.lastName }),
    ...(user.role === undefined ? {} : { role: user.role }),
    ...(user.groups === undefined ? {} : { groups: user.groups }),
  };

  return signToken(payload, secret, expiresIn);
}

/**
 * Creates a JWT that locks filter values on a shared dashboard.
 *
 * This function must only run on a trusted server. Never send the embed secret
 * to a browser.
 */
export async function createDashboardFilterToken({
  secret,
  dashboardLinkId,
  params,
  expiresIn = DEFAULT_DASHBOARD_TOKEN_EXPIRATION,
}: CreateDashboardFilterTokenOptions): Promise<string> {
  assertSecret(secret);
  assertNonEmpty(dashboardLinkId, "dashboardLinkId");
  assertExpiration(expiresIn);
  assertDashboardParams(params);

  return signToken(
    {
      dashboardLinkId,
      params,
    },
    secret,
    expiresIn,
  );
}

async function signToken(
  payload: Record<string, unknown>,
  secret: EmbedSecret,
  expiresIn: TokenExpiration,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiration =
    typeof expiresIn === "number" ? issuedAt + expiresIn : expiresIn;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiration)
    .sign(toSecretKey(secret));
}

function toSecretKey(secret: EmbedSecret): Uint8Array {
  return typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
}

function assertSecret(secret: EmbedSecret): void {
  if (
    (typeof secret === "string" && secret.length === 0) ||
    (secret instanceof Uint8Array && secret.byteLength === 0)
  ) {
    throw new TypeError("secret must not be empty");
  }
}

function assertExpiration(expiresIn: TokenExpiration): void {
  if (
    (typeof expiresIn === "string" && expiresIn.trim().length === 0) ||
    (typeof expiresIn === "number" &&
      (!Number.isFinite(expiresIn) || expiresIn <= 0))
  ) {
    throw new TypeError("expiresIn must be a positive duration");
  }
}

function assertDashboardParams(
  params: Record<string, DashboardFilterValue>,
): void {
  for (const [key, value] of Object.entries(params)) {
    assertNonEmpty(key, "params key");

    const validValue =
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)) ||
      (Array.isArray(value) &&
        value.every((item): item is string => typeof item === "string"));

    if (!validValue) {
      throw new TypeError(
        `params.${key} must be a string, string array, finite number, or boolean`,
      );
    }
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }
}
