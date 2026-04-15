"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function SignInForm({ initialFlow = "signIn" }: { initialFlow?: "signIn" | "signUp" } = {}) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">(initialFlow);
  const [step, setStep] = useState<"credentials" | { email: string }>("credentials");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  if (step !== "credentials") {
    return (
      <div className="w-full">
        <form
          className="flex flex-col gap-form-field"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            void signIn("password", formData).catch((error) => {
              toast.error("Invalid verification code. Please try again.");
              setSubmitting(false);
            });
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
            We sent a verification code to <strong>{step.email}</strong>
          </p>
          <input
            className="auth-input-field"
            type="text"
            name="code"
            placeholder="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <input name="email" value={step.email} type="hidden" />
          <input name="flow" value="email-verification" type="hidden" />
          <button className="auth-button" type="submit" disabled={submitting}>
            Verify
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => {
              setStep("credentials");
              setSubmitting(false);
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          if (flow === "signUp") {
            const password = formData.get("password") as string;
            if (password !== confirmPassword) {
              toast.error("Passwords do not match.");
              setSubmitting(false);
              return;
            }
          }
          void signIn("password", formData)
            .then((result) => {
              // When verification is needed, signIn resolves without signing in.
              // Transition to the code entry step.
              const email = formData.get("email") as string;
              setStep({ email });
              setSubmitting(false);
            })
            .catch((error) => {
              let toastTitle = "";
              if (error.message.includes("Invalid password")) {
                toastTitle = "Invalid password. Please try again.";
              } else {
                toastTitle =
                  flow === "signIn"
                    ? "Could not sign in, did you mean to sign up?"
                    : "Could not sign up, did you mean to sign in?";
              }
              toast.error(toastTitle);
              setSubmitting(false);
            });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <div className="relative">
          <input
            className="auth-input-field w-full pr-10"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        {flow === "signUp" && (
          <div className="relative">
            <input
              className="auth-input-field w-full pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        )}
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
      </form>
    </div>
  );
}
