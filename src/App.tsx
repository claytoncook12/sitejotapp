import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { SiteDetail } from "./components/SiteDetail";
import { AddObservation } from "./components/AddObservation";
import { SitePlanViewer } from "./components/SitePlanViewer";
import { SharedSiteView } from "./components/SharedSiteView";
import { LandingPage } from "./components/LandingPage";
import { SignInPage } from "./components/SignInPage";
import { SignUpPage } from "./components/SignUpPage";
import { ProfilePage } from "./components/ProfilePage";
import { useState, useEffect, useCallback, useRef } from "react";
import { Id } from "../convex/_generated/dataModel";

type Route =
  | { type: "landing" }
  | { type: "signin" }
  | { type: "signup" }
  | { type: "dashboard" }
  | { type: "profile" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> }
  | { type: "plan-viewer"; siteId: Id<"sites">; planId: Id<"sitePlans"> }
  | { type: "shared"; slug: string };

// Screen type used by child components (dashboard-level navigation)
export type Screen =
  | { type: "dashboard" }
  | { type: "profile" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> }
  | { type: "plan-viewer"; siteId: Id<"sites">; planId: Id<"sitePlans"> };

function parsePath(): Route {
  const path = window.location.pathname;

  if (path === "/signin") return { type: "signin" };
  if (path === "/signup") return { type: "signup" };
  if (path === "/dashboard/profile") return { type: "profile" };

  if (path.startsWith("/s/")) {
    const slug = path.slice("/s/".length);
    if (slug) return { type: "shared", slug };
  }

  if (path.startsWith("/dashboard")) {
    const rest = path.slice("/dashboard".length);
    const parts = rest.split("/").filter(Boolean);

    if (parts[0] === "site" && parts[1]) {
      const siteId = parts[1] as Id<"sites">;
      if (parts[2] === "visit" && parts[3] && parts[4] === "add-observation") {
        const visitId = parts[3] as Id<"visits">;
        return { type: "add-observation", siteId, visitId };
      }
      if (parts[2] === "plan" && parts[3]) {
        const planId = parts[3] as Id<"sitePlans">;
        return { type: "plan-viewer", siteId, planId };
      }
      return { type: "site-detail", siteId };
    }

    return { type: "dashboard" };
  }

  return { type: "landing" };
}

function routeToPath(route: Route): string {
  switch (route.type) {
    case "landing":
      return "/";
    case "signin":
      return "/signin";
    case "signup":
      return "/signup";
    case "dashboard":
      return "/dashboard";
    case "profile":
      return "/dashboard/profile";
    case "site-detail":
      return `/dashboard/site/${route.siteId}`;
    case "add-observation":
      return `/dashboard/site/${route.siteId}/visit/${route.visitId}/add-observation`;
    case "report":
      return `/dashboard/site/${route.siteId}`;
    case "plan-viewer":
      return `/dashboard/site/${route.siteId}/plan/${route.planId}`;
    default:
      return "/";
  }
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [route, setRoute] = useState<Route>(parsePath);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  const handleNavigate = useCallback((pathOrScreen: string | Screen) => {
    if (typeof pathOrScreen === "string") {
      navigate(pathOrScreen);
    } else {
      const r: Route = pathOrScreen;
      navigate(routeToPath(r));
    }
  }, []);

  // Screen-level navigation (used by Dashboard, SiteDetail, etc.)
  const setCurrentScreen = useCallback((screen: Screen) => {
    handleNavigate(screen);
  }, [handleNavigate]);

  useEffect(() => {
    const onPopState = () => setRoute(parsePath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Redirect authenticated users away from signin/signup to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && (route.type === "signin" || route.type === "signup")) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, route.type]);

  // Redirect unauthenticated users away from dashboard routes
  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      route.type !== "landing" &&
      route.type !== "signin" &&
      route.type !== "signup" &&
      route.type !== "shared"
    ) {
      navigate("/signin");
    }
  }, [isAuthenticated, isLoading, route.type]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Landing page — standalone layout
  if (route.type === "landing") {
    return (
      <>
        <LandingPage onNavigate={(p) => handleNavigate(p)} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <Toaster />
      </>
    );
  }

  // Sign in / Sign up — standalone layout
  if (route.type === "signin") {
    return (
      <>
        <SignInPage onNavigate={(p) => handleNavigate(p)} />
        <Toaster />
      </>
    );
  }
  if (route.type === "signup") {
    return (
      <>
        <SignUpPage onNavigate={(p) => handleNavigate(p)} />
        <Toaster />
      </>
    );
  }

  // Shared site view — no auth required
  if (route.type === "shared") {
    return (
      <>
        <SharedSiteView slug={route.slug} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <Toaster />
      </>
    );
  }

  // Dashboard shell (authenticated routes)
  const currentScreen: Screen = route as Screen;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 print:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <button
            onClick={() => handleNavigate("/dashboard")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            title="Go to Dashboard"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="10" width="70" height="80" rx="8" fill="#334155"/>
                <rect x="25" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
                <rect x="55" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
                <rect x="25" y="30" width="50" height="6" rx="2" fill="#fbbf24"/>
                <rect x="25" y="45" width="40" height="5" rx="2" fill="#94a3b8"/>
                <rect x="25" y="58" width="45" height="5" rx="2" fill="#94a3b8"/>
                <rect x="25" y="71" width="35" height="5" rx="2" fill="#94a3b8"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">SiteJot</h1>
          </button>
          <div className="flex items-center gap-4">
            <Authenticated>
              <AvatarDropdown
                onNavigate={setCurrentScreen}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
              />
            </Authenticated>
          </div>
        </div>
      </header>

      <Authenticated>
        <div className="print:hidden">
          <Breadcrumbs currentScreen={currentScreen} onNavigate={setCurrentScreen} />
        </div>
      </Authenticated>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:px-0 print:py-0 print:max-w-none">
        <Authenticated>
          {currentScreen.type === "dashboard" && (
            <Dashboard onNavigate={setCurrentScreen} />
          )}
          {currentScreen.type === "site-detail" && (
            <SiteDetail
              siteId={currentScreen.siteId}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen.type === "add-observation" && (
            <AddObservation
              siteId={currentScreen.siteId}
              visitId={currentScreen.visitId}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen.type === "plan-viewer" && (
            <SitePlanViewer
              siteId={currentScreen.siteId}
              planId={currentScreen.planId}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen.type === "profile" && (
            <ProfilePage
              onNavigate={setCurrentScreen}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
            />
          )}
        </Authenticated>
      </main>

      <Toaster />
    </div>
  );
}

function AvatarDropdown({
  onNavigate,
  isDarkMode,
  toggleTheme,
}: {
  onNavigate: (screen: Screen) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}) {
  const user = useQuery(api.auth.loggedInUser);
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (!user) return null;

  const email = user.email as string | undefined;
  const displayLabel = user.name || (email ? email.split("@")[0] : "User");
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email
      ? email[0].toUpperCase()
      : "?";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 font-semibold text-sm flex-shrink-0">
          {initials}
        </div>
        <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
          {displayLabel}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-[1000]">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name || "No display name"}</p>
            {email && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>
            )}
          </div>

          {/* Profile link */}
          <button
            onClick={() => {
              setOpen(false);
              onNavigate({ type: "profile" });
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => {
              toggleTheme();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              <span>{isDarkMode ? "Dark mode" : "Light mode"}</span>
            </div>
          </button>

          <div className="border-t border-slate-200 dark:border-slate-700 my-1" />

          {/* Log out */}
          <button
            onClick={() => {
              setOpen(false);
              void signOut().then(() => {
                window.history.pushState({}, "", "/");
                window.dispatchEvent(new PopStateEvent("popstate"));
              });
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function Breadcrumbs({
  currentScreen,
  onNavigate,
}: {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const siteId =
    currentScreen.type === "site-detail" ||
    currentScreen.type === "add-observation" ||
    currentScreen.type === "plan-viewer"
      ? currentScreen.siteId
      : null;

  const site = useQuery(api.sites.get, siteId ? { siteId } : "skip");

  const planId = currentScreen.type === "plan-viewer" ? currentScreen.planId : null;
  const plan = useQuery(api.sitePlans.get, planId ? { planId } : "skip");

  if (currentScreen.type === "dashboard") {
    return null;
  }

  if (currentScreen.type === "profile") {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-6 py-2 print:hidden">
        <nav className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <button
            onClick={() => onNavigate({ type: "dashboard" })}
            className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-medium"
          >
            Dashboard
          </button>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300">Profile</span>
        </nav>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-6 py-2 print:hidden">
      <nav className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
        <button
          onClick={() => onNavigate({ type: "dashboard" })}
          className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-medium"
        >
          Dashboard
        </button>
        <span className="text-slate-400">/</span>
        {currentScreen.type === "site-detail" && (
          <span className="text-slate-600 dark:text-slate-300 truncate max-w-xs">
            {site?.name || "Loading..."}
          </span>
        )}
        {currentScreen.type === "add-observation" && (
          <>
            <button
              onClick={() => onNavigate({ type: "site-detail", siteId: currentScreen.siteId })}
              className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-medium truncate max-w-xs"
            >
              {site?.name || "Loading..."}
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 dark:text-slate-300">Add Observation</span>
          </>
        )}
        {currentScreen.type === "plan-viewer" && (
          <>
            <button
              onClick={() => onNavigate({ type: "site-detail", siteId: currentScreen.siteId })}
              className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-medium truncate max-w-xs"
            >
              {site?.name || "Loading..."}
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 dark:text-slate-300">Plan: {plan?.name || "Loading..."}</span>
          </>
        )}
      </nav>
    </div>
  );
}
