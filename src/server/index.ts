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

/**
 * A locked shared-dashboard filter value. Basedash renders it into chart SQL as
 * raw text, without quoting or escaping: arrays are joined with `,`, and
 * numbers and booleans are converted with `String()`. Never build a value from
 * input a viewer can influence.
 */
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
  /**
   * Values override every other value for their variable and are rendered into
   * chart SQL as raw text. A value whose text contains `'`, `"`, `` ` ``, `\`,
   * `;`, `--`, or `/*` is rejected, as Basedash rejects it from a viewer for a
   * free-text variable.
   */
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
 * Basedash renders the signed values into chart SQL as raw text. Build them
 * only from data your server controls, such as tenant IDs from your own
 * database, never from input a viewer can influence.
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

    // The value is left out of the message: it may be attacker-controlled or
    // sensitive, and errors often end up in logs.
    if (!isSafeFreeText(normalizeDashboardFilterValue(value))) {
      throw new TypeError(
        `params.${key} must not contain ${FORBIDDEN_FREE_TEXT_SEQUENCES.join(
          " ",
        )}`,
      );
    }
  }
}

/**
 * Must match the free-text check Basedash applies to viewer-supplied values
 * (see CONTRACT.md). Basedash does not apply it to signed values. Its other
 * checks depend on the variable's declared type, which the SDK cannot see.
 */
const FORBIDDEN_FREE_TEXT_SEQUENCES = ["'", '"', "`", "\\", ";", "--", "/*"];

function isSafeFreeText(value: string): boolean {
  return !FORBIDDEN_FREE_TEXT_SEQUENCES.some((sequence) =>
    value.includes(sequence),
  );
}

/** Matches how Basedash turns a verified param into the text it renders. */
function normalizeDashboardFilterValue(value: DashboardFilterValue): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return String(value);
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }
}
