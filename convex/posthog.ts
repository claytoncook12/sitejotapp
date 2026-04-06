"use node";

import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!_client) {
    const apiKey = process.env.POSTHOG_API_KEY;
    if (!apiKey) {
      throw new Error("POSTHOG_API_KEY environment variable is not set");
    }
    const host = process.env.POSTHOG_HOST;
    if (!host) {
      throw new Error("POSTHOG_HOST environment variable is not set");
    }
    _client = new PostHog(apiKey, { host });
  }
  return _client;
}
