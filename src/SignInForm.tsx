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

export function SignInForm({ initialFlow = "signIn", onStepChange }: { initialFlow?: "signIn" | "signUp"; onStepChange?: (step: "credentials" | "forgot" | "reset") => void } = {}) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">(initialFlow);
  const [step, _setStep] = useState<
    "credentials" | { email: string } | "forgot" | { resetEmail: string }
  >("credentials");
  const setStep = (s: typeof step) => {
    _setStep(s);
    onStepChange?.(s === "forgot" ? "forgot" : typeof s === "object" && "resetEmail" in s ? "reset" : "credentials");
  };
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  if (typeof step === "object" && "email" in step) {
    return (
      <div className="w-full">
        <form
          className="flex flex-col gap-form-field"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            void signIn("password", formData).catch((error) => {
              if (error.message.includes("InvalidAccountId") || error.message.includes("code")) {
                toast.error("Invalid or expired verification code. Please try again.");
              } else {
                toast.error("Verification failed: " + error.message);
              }
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

  // Forgot password – enter email to receive reset code
  if (step === "forgot") {
    return (
      <div className="w-full">
        <form
          className="flex flex-col gap-form-field"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            const email = formData.get("email") as string;
            formData.set("flow", "reset");
            void signIn("password", formData)
              .then(() => {
                toast.success("Reset code sent to " + email);
                setStep({ resetEmail: email });
                setSubmitting(false);
              })
              .catch(() => {
                toast.error("Could not send reset code. Check your email and try again.");
                setSubmitting(false);
              });
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
            Enter your email and we'll send you a code to reset your password.
          </p>
          <input
            key="forgot-email"
            className="auth-input-field"
            type="email"
            name="email"
            placeholder="Email"
            required
          />
          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send Reset Code"}
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => {
              setStep("credentials");
              setSubmitting(false);
            }}
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  // Forgot password – enter code + new password
  if (typeof step === "object" && "resetEmail" in step) {
    return (
      <div className="w-full">
        <form
          className="flex flex-col gap-form-field"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const newPw = formData.get("newPassword") as string;
            const confirmPw = formData.get("confirmPassword") as string;
            if (newPw !== confirmPw) {
              toast.error("Passwords do not match.");
              return;
            }
            if (newPw.length < 8) {
              toast.error("Password must be at least 8 characters.");
              return;
            }
            setSubmitting(true);
            formData.set("email", step.resetEmail);
            formData.set("flow", "reset-verification");
            formData.delete("confirmPassword");
            void signIn("password", formData)
              .then(() => {
                toast.success("Password reset! You can now sign in.");
                setStep("credentials");
                setSubmitting(false);
                setShowNewPassword(false);
              })
              .catch((error) => {
                if (error.message?.includes("code") || error.message?.includes("InvalidAccountId")) {
                  toast.error("Invalid or expired code. Please try again.");
                } else {
                  toast.error("Failed to reset password.");
                }
                setSubmitting(false);
              });
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
            Enter the code sent to <strong>{step.resetEmail}</strong> and your new password.
          </p>
          <input
            className="auth-input-field"
            type="text"
            name="code"
            placeholder="Reset code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <div className="relative">
            <input
              className="auth-input-field w-full pr-10"
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              placeholder="New password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
            >
              <EyeIcon open={showNewPassword} />
            </button>
          </div>
          <div className="relative">
            <input
              className="auth-input-field w-full pr-10"
              type={showNewPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
            >
              <EyeIcon open={showNewPassword} />
            </button>
          </div>
          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => {
              setStep("credentials");
              setSubmitting(false);
              setShowNewPassword(false);
            }}
          >
            Back to sign in
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
          key="signin-email"
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
        {flow === "signIn" && (
          <button
            type="button"
            className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 self-end -mt-1"
            onClick={() => {
              setStep("forgot");
              setSubmitting(false);
            }}
          >
            Forgot password?
          </button>
        )}
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
      </form>
    </div>
  );
}
