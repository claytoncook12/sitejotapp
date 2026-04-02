import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import type { Screen } from "../App";

export function ProfilePage({
  onNavigate,
  isDarkMode,
  toggleTheme,
}: {
  onNavigate: (screen: Screen) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}) {
  const user = useQuery(api.auth.loggedInUser);
  const updateProfile = useMutation(api.auth.updateProfile);

  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user?.name]);

  if (user === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const email = user.email as string | undefined;
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name: displayName.trim() || undefined });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = displayName.trim() !== (user.name || "");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate({ type: "dashboard" })}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h2>
      </div>

      {/* Avatar & Identity Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {user.name || "No display name"}
            </h3>
            {email && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{email}</p>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Email (read-only) */}
          {email && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 rounded-lg font-medium transition-colors"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Preferences Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preferences</h3>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose light or dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full transition-colors bg-slate-300 dark:bg-amber-400"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform flex items-center justify-center ${
                isDarkMode ? "translate-x-7" : ""
              }`}
            >
              {isDarkMode ? (
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">User ID</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-xs truncate ml-4 max-w-[200px]">
              {user._id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Member since</span>
            <span className="text-slate-700 dark:text-slate-300">
              {new Date(user._creationTime).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
