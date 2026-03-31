import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { SiteDetail } from "./components/SiteDetail";
import { AddObservation } from "./components/AddObservation";
import { SitePlanViewer } from "./components/SitePlanViewer";
import { useState, useEffect, useCallback } from "react";
import { Id } from "../convex/_generated/dataModel";

type Screen = 
  | { type: "dashboard" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> }
  | { type: "plan-viewer"; siteId: Id<"sites">; planId: Id<"sitePlans"> };

// Parse hash to Screen
function parseHash(): Screen {
  const hash = window.location.hash.slice(1); // Remove #
  if (!hash || hash === "/") {
    return { type: "dashboard" };
  }
  
  const parts = hash.split("/").filter(Boolean);
  
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

// Convert Screen to hash
function screenToHash(screen: Screen): string {
  switch (screen.type) {
    case "dashboard":
      return "#/";
    case "site-detail":
      return `#/site/${screen.siteId}`;
    case "add-observation":
      return `#/site/${screen.siteId}/visit/${screen.visitId}/add-observation`;
    case "report":
      return `#/site/${screen.siteId}`;
    case "plan-viewer":
      return `#/site/${screen.siteId}/plan/${screen.planId}`;
    default:
      return "#/";
  }
}

export default function App() {
  const [currentScreen, setCurrentScreenState] = useState<Screen>(parseHash);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark mode
  });

  // Navigate and update hash
  const setCurrentScreen = useCallback((screen: Screen) => {
    setCurrentScreenState(screen);
    window.location.hash = screenToHash(screen);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentScreenState(parseHash());
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const goToDashboard = () => setCurrentScreen({ type: "dashboard" });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 print:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <button
            onClick={goToDashboard}
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
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Authenticated>
              <SignOutButton />
            </Authenticated>
          </div>
        </div>
      </header>

      <Authenticated>
        <Breadcrumbs currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      </Authenticated>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Content currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
      </main>
      
      <Toaster />
    </div>
  );
}

function Breadcrumbs({ 
  currentScreen, 
  onNavigate 
}: { 
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const siteId = currentScreen.type === "site-detail" || currentScreen.type === "add-observation" || currentScreen.type === "plan-viewer"
    ? currentScreen.siteId 
    : null;
  
  const site = useQuery(api.sites.get, siteId ? { siteId } : "skip");
  
  const planId = currentScreen.type === "plan-viewer" ? currentScreen.planId : null;
  const plan = useQuery(api.sitePlans.get, planId ? { planId } : "skip");

  if (currentScreen.type === "dashboard") {
    return null;
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

function Content({ 
  currentScreen, 
  setCurrentScreen 
}: { 
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div>
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
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Welcome to SiteJot</h2>
            <p className="text-slate-500 dark:text-slate-300">Professional field documentation for all</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
