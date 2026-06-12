import * as React from "react";
import {
  createFileRoute,
  Link,
  useRouteContext,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOAuthConfig, verifyGoogleOneTap } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { getHello } from "@/server/functions";
import { useCounterStore } from "@/stores/counterStore";

export const Route = createFileRoute("/")({
  component: Home,
});

type SessionUser = {
  email?: string;
  name?: string;
  sub?: string;
} | null;

type OAuthConfig = {
  authIssuer: string;
  clientId: string;
  redirectUri: string;
};

type GoogleVerifyResult = {
  credential: string;
  user: {
    email: string;
    name: string;
    sub: string;
  };
};

type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment?: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason?: () => string;
};

type OneTapPromptMoment = "displayed" | "not_displayed" | "skipped" | "dismissed";

type OneTapPromptDetail = {
  moment: OneTapPromptMoment;
  reason: string;
  reasonDescription: string;
};

// Google One Tap type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (notification?: (notification: GooglePromptNotification) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
    __googleOneTapInitialized?: boolean;
  }
}

const ONE_TAP_LOG_PREFIX = "[Header.useEffect]";
const GOOGLE_GSI_SCRIPT_ID = "google-gsi-client-script";

const ONE_TAP_NOT_DISPLAYED_REASON_TEXT: Record<string, string> = {
  browser_not_supported: "Browser does not support Google One Tap.",
  invalid_client: "Google Client ID is invalid or does not match the current domain.",
  missing_client_id: "Google Client ID is missing.",
  secure_http_required: "One Tap requires HTTPS or localhost.",
  suppressed_by_user: "User previously dismissed One Tap; currently suppressed.",
  unregistered_origin: "Current page origin is not registered in Google OAuth settings.",
  opt_out_or_no_session: "User does not meet display conditions (opted out or no Google session).",
  unknown_reason: "Reason not disclosed due to browser privacy policy or FedCM takeover.",
};

const ONE_TAP_SKIPPED_REASON_TEXT: Record<string, string> = {
  auto_cancel: "User was performing another interaction; One Tap was auto-cancelled.",
  user_cancel: "User manually closed One Tap.",
  tap_outside: "User clicked outside the prompt; One Tap was dismissed.",
  issuing_failed: "Google credential issuance failed.",
  unknown_reason: "Browser returned only a generic skip reason (common with privacy restrictions/FedCM).",
};

const ONE_TAP_DISMISSED_REASON_TEXT: Record<string, string> = {
  credential_returned: "User returned a credential.",
  cancel_called: "Cancel was called programmatically.",
  flow_restarted: "One Tap flow was restarted.",
  unknown_reason: "No recognizable dismiss reason was provided.",
};

function logOneTapInfo(message: string, detail?: Record<string, unknown>) {
  const detailString = detail ? JSON.stringify(detail) : "";
  const text = detailString
    ? `${ONE_TAP_LOG_PREFIX} ${message}: ${detailString}`
    : `${ONE_TAP_LOG_PREFIX} ${message}`;
  console.info(text);
  if (detail) {
    console.info(`${ONE_TAP_LOG_PREFIX} ${message} object:`, detail);
  }
}

function logOneTapWarn(message: string, detail?: Record<string, unknown>) {
  const detailString = detail ? JSON.stringify(detail) : "";
  const text = detailString
    ? `${ONE_TAP_LOG_PREFIX} ${message}: ${detailString}`
    : `${ONE_TAP_LOG_PREFIX} ${message}`;
  console.warn(text);
  if (detail) {
    console.warn(`${ONE_TAP_LOG_PREFIX} ${message} object:`, detail);
  }
}

function logOneTapError(message: string, detail?: Record<string, unknown>) {
  const detailString = detail ? JSON.stringify(detail) : "";
  const text = detailString
    ? `${ONE_TAP_LOG_PREFIX} ${message}: ${detailString}`
    : `${ONE_TAP_LOG_PREFIX} ${message}`;
  console.error(text);
  if (detail) {
    console.error(`${ONE_TAP_LOG_PREFIX} ${message} object:`, detail);
  }
}

function readOneTapReason(
  reasonReader: (() => string) | undefined,
  fallbackReason: string,
): string {
  if (!reasonReader) {
    return fallbackReason;
  }
  try {
    const reason = reasonReader();
    return reason || fallbackReason;
  } catch {
    return fallbackReason;
  }
}

function resolveOneTapPromptDetail(
  notification: GooglePromptNotification,
): OneTapPromptDetail {
  if (notification.isNotDisplayed()) {
    const reason = readOneTapReason(
      notification.getNotDisplayedReason,
      "unknown_reason",
    );
    return {
      moment: "not_displayed",
      reason,
      reasonDescription:
        ONE_TAP_NOT_DISPLAYED_REASON_TEXT[reason] ||
        `Unknown not_displayed reason: ${reason}`,
    };
  }

  if (notification.isSkippedMoment()) {
    const reason = readOneTapReason(notification.getSkippedReason, "unknown_reason");
    return {
      moment: "skipped",
      reason,
      reasonDescription:
        ONE_TAP_SKIPPED_REASON_TEXT[reason] ||
        `Unknown skipped reason: ${reason}`,
    };
  }

  if (notification.isDismissedMoment?.()) {
    const reason = readOneTapReason(notification.getDismissedReason, "unknown_reason");
    return {
      moment: "dismissed",
      reason,
      reasonDescription:
        ONE_TAP_DISMISSED_REASON_TEXT[reason] ||
        `Unknown dismissed reason: ${reason}`,
    };
  }

  return {
    moment: "displayed",
    reason: "displayed",
    reasonDescription: "One Tap displayed (or credential return phase entered).",
  };
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function prepareOAuthLogin() {
  const config = (await getOAuthConfig()) as OAuthConfig;
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = Math.random().toString(36).substring(2);

  sessionStorage.setItem("oauth_code_verifier", codeVerifier);
  return { config, codeChallenge, state };
}

function buildAuthorizeParams(
  config: { clientId: string; redirectUri: string },
  codeChallenge: string,
  state: string,
) {
  return new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
}

function Home() {
  const { session } = useRouteContext({ from: "__root__" }) as {
    session: SessionUser;
  };

  // TanStack Query example: using a Server Function
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["hello", "Template"],
    queryFn: () => getHello({ data: { name: "Template" } }),
    enabled: false,
  });

  // Zustand example: simple global state management
  const { count, increment, decrement, reset } = useCounterStore();

  // Hono RPC example state
  const [rpcName, setRpcName] = React.useState("World");
  const [rpcResult, setRpcResult] = React.useState<string>("");
  const [rpcLoading, setRpcLoading] = React.useState(false);
  const [rpcError, setRpcError] = React.useState<string>("");

  const handleLogin = async () => {
    const { config, codeChallenge, state } = await prepareOAuthLogin();
    const params = buildAuthorizeParams(config, codeChallenge, state);
    window.location.href = `${config.authIssuer}/api/auth/oauth2/authorize?${params.toString()}`;
  };

  const handleGoogleLogin = async () => {
    const { config, codeChallenge, state } = await prepareOAuthLogin();
    const authorizeParams = buildAuthorizeParams(config, codeChallenge, state);
    const returnTo = `/api/auth/oauth2/authorize?${authorizeParams.toString()}`;
    const socialUrl = new URL(`${config.authIssuer}/api/social-auth/google/start`);

    socialUrl.searchParams.set("client_id", config.clientId);
    socialUrl.searchParams.set("return_to", returnTo);

    window.location.href = socialUrl.toString();
  };

  const handleLogout = () => {
    document.cookie = "demo_session=; path=/; max-age=0";
    window.google?.accounts?.id.disableAutoSelect();

    const authIssuer =
      (import.meta.env.VITE_AUTH_ISSUER as string | undefined) ||
      "https://pro.windseed.app";
    const callbackUrl = window.location.origin;
    const signOutUrl = `${authIssuer}/api/auth/sign-out-redirect?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    window.location.href = signOutUrl;
  };

  const handleGoogleOneTapCallback = React.useCallback(
    async (response: { credential: string }) => {
      logOneTapInfo("Received One Tap credential callback", {
        hasCredential: Boolean(response.credential),
        credentialLength: response.credential?.length || 0,
      });
      try {
        const result = (await verifyGoogleOneTap({
          data: { credential: response.credential },
        })) as GoogleVerifyResult;

        logOneTapInfo("One Tap credential verified; writing session and reloading page", {
          userEmail: result.user.email,
          userSub: result.user.sub,
        });
        document.cookie = `demo_session=${result.credential}; path=/; max-age=86400; SameSite=Lax`;
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logOneTapError("One Tap credential verification failed", {
          errorMessage: message,
        });
        alert(`Google sign-in failed: ${message}`);
      }
    },
    [],
  );

  const handleOneTapPromptNotification = React.useCallback(
    (notification: GooglePromptNotification) => {
      const detail = resolveOneTapPromptDetail(notification);
      const logPayload = {
        moment: detail.moment,
        reason: detail.reason,
        reasonDescription: detail.reasonDescription,
      };

      if (detail.moment === "displayed") {
        logOneTapInfo("One Tap displayed", logPayload);
        return;
      }

      if (detail.moment === "dismissed") {
        logOneTapInfo("One Tap dismissed", logPayload);
        return;
      }

      if (detail.moment === "not_displayed") {
        logOneTapWarn(`One Tap not displayed: ${detail.reason}`, logPayload);
        return;
      }

      logOneTapWarn(`One Tap skipped: ${detail.reason}`, logPayload);
    },
    [],
  );

  React.useEffect(() => {
    if (session) {
      logOneTapInfo("User is already signed in; skipping One Tap initialization");
      return;
    }

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
      | string
      | undefined;

    if (!googleClientId) {
      logOneTapWarn("VITE_GOOGLE_CLIENT_ID is missing; skipping One Tap initialization");
      return;
    }

    if (window.__googleOneTapInitialized) {
      logOneTapInfo("One Tap already initialized; skipping duplicate initialization");
      return;
    }

    const initializeGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        logOneTapWarn("Google GSI script loaded but window.google.accounts.id is unavailable");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleOneTapCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });

      window.__googleOneTapInitialized = true;
      logOneTapInfo("One Tap initialization complete; starting prompt", {
        clientIdPrefix: googleClientId.slice(0, 10),
        useFedCMForPrompt: false,
      });
      window.google.accounts.id.prompt(handleOneTapPromptNotification);
    };

    const existingScript = document.getElementById(
      GOOGLE_GSI_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      logOneTapInfo("Existing Google GSI script detected; reusing script and attempting initialization");
      initializeGoogleOneTap();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      logOneTapInfo("Google GSI script loaded");
      initializeGoogleOneTap();
    };

    script.onerror = () => {
      logOneTapError("Google GSI script failed to load", {
        scriptSrc: script.src,
      });
    };

    logOneTapInfo("Loading Google GSI script", { scriptSrc: script.src });
    document.head.appendChild(script);
  }, [handleGoogleOneTapCallback, handleOneTapPromptNotification, session]);

  // Test GET request
  const testRpcGet = async () => {
    setRpcLoading(true);
    setRpcError("");
    try {
      const res = await apiClient.api.hello.$get({
        query: { name: rpcName },
      });
      const response = await res.json();
      setRpcResult(response.message);
    } catch (err) {
      setRpcError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRpcLoading(false);
    }
  };

  // Test POST request
  const testRpcPost = async () => {
    setRpcLoading(true);
    setRpcError("");
    try {
      const res = await apiClient.api.hello.$post({
        json: { name: rpcName },
      });
      const response = await res.json();
      setRpcResult(response.message);
    } catch (err) {
      setRpcError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRpcLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <h1 className="text-4xl font-bold text-foreground">
          TanStack Start + Cloudflare Workers
        </h1>
        <p className="text-muted-foreground">
          Full-stack template: TanStack Start + React + Cloudflare Workers
        </p>

        <div className="space-y-4 rounded-lg border p-6 text-left">
          <h2 className="text-lg font-semibold">Social Login Demo</h2>
          <p className="text-sm text-muted-foreground">
            Hub default domain: <code>https://pro.windseed.app</code>
          </p>

          {session ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{session.name || session.email || "Signed-in user"}</p>
                  <p className="text-sm text-muted-foreground">{session.email || session.sub}</p>
                </div>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleGoogleLogin}
                variant="secondary"
                className="gap-2 border bg-white text-gray-700 hover:bg-gray-100"
              >
                <GoogleIcon />
                Sign in with Google
              </Button>
              <Button onClick={handleLogin} className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">TanStack Query Example</h2>
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "Loading..." : "Test Server Function"}
          </Button>
          {error && <p className="text-destructive">Error: {String(error)}</p>}
          {data && (
            <p className="rounded-md bg-muted px-4 py-2 text-foreground">{data.message}</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Zustand Example</h2>
          <p className="text-2xl font-mono">{count}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={decrement}>
              -
            </Button>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button variant="outline" onClick={increment}>
              +
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Hono RPC Example</h2>
          <p className="text-sm text-muted-foreground">Type-safe client–server communication</p>
          <div className="flex items-center justify-center gap-2">
            <Input
              type="text"
              value={rpcName}
              onChange={(e) => setRpcName(e.target.value)}
              placeholder="Enter a name"
              className="max-w-xs"
            />
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={testRpcGet} disabled={rpcLoading}>
              {rpcLoading ? "Loading..." : "Test GET"}
            </Button>
            <Button onClick={testRpcPost} disabled={rpcLoading} variant="secondary">
              {rpcLoading ? "Loading..." : "Test POST"}
            </Button>
          </div>
          {rpcError && <p className="text-sm text-destructive">Error: {rpcError}</p>}
          {rpcResult && (
            <p className="rounded-md bg-muted px-4 py-2 text-foreground">{rpcResult}</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Examples</h2>
          <div className="flex justify-center gap-2">
            <Link to="/ssr">
              <Button variant="outline">SSR Example →</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            View the route loader server-side data prefetching example
          </p>
        </div>

        <div className="pt-4 text-sm text-muted-foreground">
          <p>
            Edit <code className="rounded bg-muted px-1">src/routes/index.tsx</code> to get started
          </p>
        </div>
      </div>
    </div>
  );
}
