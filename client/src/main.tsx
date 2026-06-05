import { inject } from "@vercel/analytics";
import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";

import {
  DesktopDiscover,
  DesktopExplore,
  DesktopFriends,
  DesktopProfile,
  type DesktopRoute,
} from "./design/desktop-screens.js";
import {
  MobileDiscover,
  MobileExplore,
  MobileFriends,
  MobileProfile,
} from "./design/mobile-screens.js";
import { Icon } from "./design/icons.js";
import logoUrl from "./logo.png";

import "./design/sift-design-system.css";

inject();

type AccountUser = {
  displayName?: string;
  email?: string;
};

type AuthStatus = {
  authenticated?: boolean;
  user?: AccountUser;
};

type AuthMode = "signin" | "signup";
type AppRoute = DesktopRoute;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : res.statusText);
  }
  return data;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : res.statusText);
  }
  return data;
}


function AuthShell({
  error,
  loading,
  mode,
  onModeChange,
  onSubmit,
}: {
  error: string | null;
  loading: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, mode: AuthMode) => void;
}) {
  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <div style={authStyles.brand}>
          <img src={logoUrl} alt="" width={40} height={40} style={authStyles.logo} decoding="async" />
          <span style={authStyles.brandName}>Sift</span>
        </div>

        <p style={authStyles.eyebrow}>Music discovery</p>
        <h1 style={authStyles.title}>Sign in to Sift</h1>
        <p style={authStyles.copy}>
          Create an account or sign in. Sift will open the desktop or mobile app interface for your device.
        </p>

        {error && <p style={authStyles.error}>{error}</p>}

        <div style={authStyles.tabs} role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            style={{ ...authStyles.tab, ...(mode === "signin" ? authStyles.tabActive : {}) }}
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            style={{ ...authStyles.tab, ...(mode === "signup" ? authStyles.tabActive : {}) }}
            onClick={() => onModeChange("signup")}
          >
            Sign up
          </button>
        </div>

        <form style={authStyles.form} onSubmit={(event) => onSubmit(event, mode)}>
          {mode === "signup" && (
            <label style={authStyles.field}>
              <span style={authStyles.label}>Name</span>
              <input style={authStyles.input} type="text" name="displayName" autoComplete="name" />
            </label>
          )}
          <label style={authStyles.field}>
            <span style={authStyles.label}>Email</span>
            <input style={authStyles.input} type="email" name="email" autoComplete="email" required />
          </label>
          <label style={authStyles.field}>
            <span style={authStyles.label}>Password</span>
            <input
              style={authStyles.input}
              type="password"
              name="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </label>
          <button type="submit" style={authStyles.primary} disabled={loading}>
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={authStyles.divider}>
          <span />or<span />
        </div>

        <a href="/auth/google" style={authStyles.google}>
          Continue with Google
        </a>
      </section>
    </main>
  );
}

function AuthenticatedChrome() {
  return (
    <div style={chromeStyles.stack}>
      <a href="/auth/login" style={chromeStyles.syncBtn}>
        <Icon.Spotify size={16} color="#1ed760" />
        <span>Sync Spotify</span>
      </a>
      <a href="/auth/logout" style={chromeStyles.logoutBtn}>
        Sign out
      </a>
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    w: typeof window === "undefined" ? 390 : window.innerWidth,
    h: typeof window === "undefined" ? 844 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

function ResponsiveSiftApp() {
  const [route, setRoute] = useState<AppRoute>("discover");
  const isDesktop = useMediaQuery("(min-width: 820px)");
  const { w, h } = useViewportSize();

  const navigate = (id: string) => {
    if (id === "discover" || id === "explore" || id === "friends" || id === "profile") {
      setRoute(id);
    }
  };

  if (isDesktop) {
    const desktopProps = { onNavigate: setRoute };
    return (
      <main style={appStyles.desktopHost}>
        {route === "discover" && <DesktopDiscover {...desktopProps} />}
        {route === "explore" && <DesktopExplore {...desktopProps} />}
        {route === "friends" && <DesktopFriends {...desktopProps} />}
        {route === "profile" && <DesktopProfile {...desktopProps} />}
      </main>
    );
  }

  const scale = Math.min(w / 390, h / 844, 1);
  const mobileProps = { onNavigate: navigate };
  return (
    <main className="sift-responsive-mobile" style={appStyles.mobileHost}>
      <style>{`.sift-responsive-mobile .phone{border-radius:0!important;box-shadow:none!important}`}</style>
      <div style={{ width: 390 * scale, height: 844 * scale, overflow: "hidden" }}>
        <div style={{ width: 390, height: 844, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {route === "discover" && <MobileDiscover variant="rich" {...mobileProps} />}
          {route === "explore" && <MobileExplore {...mobileProps} />}
          {route === "friends" && <MobileFriends {...mobileProps} />}
          {route === "profile" && <MobileProfile {...mobileProps} />}
        </div>
      </div>
    </main>
  );
}

function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 820px)");

  useEffect(() => {
    const hash = (location.hash || "").replace(/^#/, "");
    if (hash.startsWith("error=")) {
      setError(decodeURIComponent(hash.slice("error=".length)));
      history.replaceState(null, "", location.pathname + location.search);
    } else if (hash === "connected") {
      history.replaceState(null, "", location.pathname + location.search);
    }

    fetchJson<AuthStatus>("/api/auth-status")
      .then((next) => setStatus(next))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not reach backend.");
        setStatus({ authenticated: false });
      });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>, nextMode: AuthMode) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const displayName = String(form.get("displayName") || "");
    try {
      await postJson(nextMode === "signin" ? "/api/auth/signin" : "/api/auth/signup", {
        email,
        password,
        ...(nextMode === "signup" ? { displayName } : {}),
      });
      setStatus(await fetchJson<AuthStatus>("/api/auth-status"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (status === null) {
    return <main style={authStyles.loading}>Loading Sift...</main>;
  }

  if (!status.authenticated) {
    return (
      <AuthShell
        error={error}
        loading={busy}
        mode={mode}
        onModeChange={setMode}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <>
      <ResponsiveSiftApp />
      {!isDesktop && <AuthenticatedChrome />}
    </>
  );
}

const chromeStyles = {
  stack: {
    position: "fixed" as const,
    zIndex: 50,
    left: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    pointerEvents: "auto" as const,
  } satisfies React.CSSProperties,
  syncBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,.82)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(20,17,15,.08)",
    boxShadow: "0 2px 8px rgba(20,17,15,.06)",
    fontFamily: "var(--font-body)",
    fontSize: 12,
    fontWeight: 700,
    color: "#14110f",
    textDecoration: "none",
    cursor: "pointer",
  } satisfies React.CSSProperties,
  logoutBtn: {
    display: "block",
    padding: "6px 14px",
    borderRadius: 999,
    background: "rgba(20,17,15,.05)",
    fontFamily: "var(--font-body)",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--ink-3)",
    textDecoration: "none",
    textAlign: "center" as const,
    cursor: "pointer",
  } satisfies React.CSSProperties,
};

const authStyles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(circle at 50% -10%, rgba(91,43,214,.18), transparent 36%), #f0eee9",
    color: "#14110f",
    fontFamily: "var(--font-body)",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f0eee9",
    color: "#14110f",
    fontFamily: "var(--font-body)",
  },
  card: {
    width: "min(100%, 440px)",
    padding: 24,
    borderRadius: 24,
    background: "rgba(255,255,255,.86)",
    border: "1px solid rgba(20,18,16,.08)",
    boxShadow: "0 24px 80px rgba(20,18,16,.14)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 22 },
  logo: { borderRadius: 12 },
  brandName: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 },
  eyebrow: {
    margin: "0 0 6px",
    color: "#5b2bd6",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".12em",
    textTransform: "uppercase" as const,
  },
  title: {
    margin: "0 0 8px",
    fontFamily: "var(--font-display)",
    fontSize: 36,
    lineHeight: 1,
    letterSpacing: "-.035em",
  },
  copy: { margin: "0 0 18px", color: "rgba(20,17,15,.68)", fontSize: 14 },
  error: {
    margin: "0 0 14px",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#fbe4e4",
    color: "#9a2424",
    fontSize: 13,
  },
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 },
  tab: {
    height: 38,
    borderRadius: 999,
    border: "1px solid rgba(20,18,16,.1)",
    background: "#fff",
    color: "#45413c",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  tabActive: { background: "#14110f", color: "#fff", borderColor: "#14110f" },
  form: { display: "grid", gap: 12 },
  field: { display: "grid", gap: 5 },
  label: { fontSize: 12, fontWeight: 700, color: "rgba(20,17,15,.72)" },
  input: {
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(20,18,16,.12)",
    background: "#fff",
    color: "#14110f",
    padding: "0 12px",
    font: "inherit",
    outlineColor: "#5b2bd6",
  },
  primary: {
    height: 46,
    border: 0,
    borderRadius: 999,
    background: "#14110f",
    color: "#fff",
    font: "inherit",
    fontWeight: 800,
    cursor: "pointer",
  },
  divider: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
    margin: "18px 0 12px",
    color: "rgba(20,17,15,.45)",
    fontSize: 12,
  },
  google: {
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(20,18,16,.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#14110f",
    background: "#fff",
    textDecoration: "none",
    fontWeight: 800,
  },
};

const appStyles = {
  desktopHost: {
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "var(--bg)",
  },
  mobileHost: {
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    background: "var(--bg)",
  },
};

createRoot(document.getElementById("root")!).render(<App />);
