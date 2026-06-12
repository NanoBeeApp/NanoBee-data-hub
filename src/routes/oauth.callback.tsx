import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/oauth/callback")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: (search.code as string) || "",
      state: (search.state as string) || "",
      error: (search.error as string) || "",
    };
  },
  component: CallbackComponent,
});

type TokenResponse = {
  access_token: string;
  id_token: string;
};

function getAuthConfig() {
  return {
    authIssuer:
      (import.meta.env.VITE_AUTH_ISSUER as string | undefined) ||
      "https://pro.windseed.app",
    clientId: (import.meta.env.VITE_AUTH_CLIENT_ID as string | undefined) || "",
    clientSecret:
      (import.meta.env.VITE_AUTH_CLIENT_SECRET as string | undefined) || "",
    redirectUri:
      (import.meta.env.VITE_AUTH_REDIRECT_URI as string | undefined) ||
      `${window.location.origin}/oauth/callback`,
  };
}

async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const config = getAuthConfig();

  const response = await fetch(`${config.authIssuer}/api/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as TokenResponse;
}

function CallbackComponent() {
  const { code, error } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      navigate({ to: "/" });
      return;
    }

    if (!code) {
      navigate({ to: "/" });
      return;
    }

    const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
    if (!codeVerifier) {
      navigate({ to: "/" });
      return;
    }

    sessionStorage.removeItem("oauth_code_verifier");

    exchangeCodeForToken(code, codeVerifier)
      .then((tokens) => {
        if (tokens.id_token) {
          document.cookie = `demo_session=${tokens.id_token}; path=/; max-age=3600; SameSite=Lax`;
        }
        window.location.href = "/";
      })
      .catch(() => {
        navigate({ to: "/" });
      });
  }, [code, error, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">正在验证登录...</h1>
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    </div>
  );
}
