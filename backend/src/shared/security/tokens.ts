import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";

export type AccessTokenPayload = {
  user_id: string;
  sub: string;
};

export function createAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: env.jwtAlgorithm,
    expiresIn: env.accessTokenExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: [env.jwtAlgorithm],
  }) as AccessTokenPayload;
}

export function createRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(length))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}
