import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

type AuthEnv = {
  AUTH_ISSUER: string;
  AUTH_CLIENT_ID: string;
  AUTH_CLIENT_SECRET: string;
  AUTH_REDIRECT_URI: string;
  SESSION_SECRET: string;
};

type TokenInfo = {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};

function getAuthEnv(): AuthEnv {
  return {
    AUTH_ISSUER:
      import.meta.env.VITE_AUTH_ISSUER || "https://pro.windseed.app",
    AUTH_CLIENT_ID: import.meta.env.VITE_AUTH_CLIENT_ID || "",
    AUTH_CLIENT_SECRET: import.meta.env.VITE_AUTH_CLIENT_SECRET || "",
    AUTH_REDIRECT_URI: import.meta.env.VITE_AUTH_REDIRECT_URI || "",
    SESSION_SECRET: import.meta.env.VITE_SESSION_SECRET || "",
  };
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const separatorIndex = raw.indexOf("=");
        if (separatorIndex < 0) {
          return [raw, ""];
        }
        const key = raw.slice(0, separatorIndex).trim();
        const value = raw.slice(separatorIndex + 1).trim();
        return [key, value];
      }),
  );
}

// 仅用于 demo 中读取 payload，不做签名校验。
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) {
      return null;
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );

    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const cookieHeader = request?.headers.get("cookie") || "";
  const cookies = parseCookieHeader(cookieHeader);
  const sessionToken = cookies.demo_session;

  if (!sessionToken) {
    return null;
  }

  const decoded = decodeJwt(sessionToken);
  if (!decoded) {
    return null;
  }

  const email = typeof decoded.email === "string" ? decoded.email : "";
  const name = typeof decoded.name === "string" ? decoded.name : "";
  const sub = typeof decoded.sub === "string" ? decoded.sub : "";

  if (!email && !name && !sub) {
    return null;
  }

  return { email, name, sub };
});

export const getOAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const env = getAuthEnv();
  return {
    authIssuer: env.AUTH_ISSUER,
    clientId: env.AUTH_CLIENT_ID,
    redirectUri: env.AUTH_REDIRECT_URI,
  };
});

export const verifyGoogleOneTap = createServerFn({ method: "POST" }).handler(
  async (opts: { data: { credential: string } }) => {
    const { credential } = opts.data;
    if (!credential) {
      throw new Error("Missing Google credential");
    }

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

    if (!googleClientId) {
      throw new Error("Google Client ID not configured");
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to verify Google token: ${errorText}`);
    }

    const tokenInfo = (await response.json()) as TokenInfo;

    if (tokenInfo.aud !== googleClientId) {
      throw new Error("Invalid token audience");
    }

    if (
      tokenInfo.iss !== "https://accounts.google.com" &&
      tokenInfo.iss !== "accounts.google.com"
    ) {
      throw new Error("Invalid token issuer");
    }

    if (tokenInfo.email_verified !== "true") {
      throw new Error("Email not verified");
    }

    return {
      success: true,
      credential,
      user: {
        email: tokenInfo.email,
        name: tokenInfo.name || tokenInfo.email,
        sub: tokenInfo.sub,
        picture: tokenInfo.picture,
        givenName: tokenInfo.given_name,
        familyName: tokenInfo.family_name,
      },
    };
  },
);
