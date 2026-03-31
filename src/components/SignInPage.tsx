import { SignInForm } from "../SignInForm";

export function SignInPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            onClick={() => onNavigate("/")}
            className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="10" width="70" height="80" rx="8" fill="#334155" />
                <rect x="25" y="5" width="20" height="15" rx="3" fill="#fbbf24" />
                <rect x="55" y="5" width="20" height="15" rx="3" fill="#fbbf24" />
                <rect x="25" y="30" width="50" height="6" rx="2" fill="#fbbf24" />
                <rect x="25" y="45" width="40" height="5" rx="2" fill="#94a3b8" />
                <rect x="25" y="58" width="45" height="5" rx="2" fill="#94a3b8" />
                <rect x="25" y="71" width="35" height="5" rx="2" fill="#94a3b8" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">SiteJot</span>
          </button>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Sign In</h2>
          <p className="text-slate-500 dark:text-slate-300">Welcome back to SiteJot</p>
        </div>
        <SignInForm initialFlow="signIn" />
        <div className="text-center mt-6">
          <span className="text-sm text-slate-500 dark:text-slate-400">Don't have an account? </span>
          <button
            onClick={() => onNavigate("/signup")}
            className="text-sm text-amber-500 hover:text-amber-600 font-medium hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
