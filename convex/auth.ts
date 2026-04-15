import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { ResendOTP } from "./ResendOTP";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
import { query, mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Scrypt } from "lucia";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ verify: ResendOTP, reset: ResendOTPPasswordReset }), Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    await ctx.db.patch(userId, {
      name: args.name,
    });
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .unique();

    if (!account || !account.secret) {
      throw new Error("No password account found");
    }

    const scrypt = new Scrypt();
    const valid = await scrypt.verify(account.secret, args.currentPassword);
    if (!valid) {
      throw new Error("Invalid current password");
    }

    const newHash = await scrypt.hash(args.newPassword);
    await ctx.db.patch(account._id, { secret: newHash });
  },
});
