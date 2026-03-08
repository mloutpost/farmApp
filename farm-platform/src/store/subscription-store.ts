import { create } from "zustand";
import type { SubscriptionTier } from "@/types";
import { TIER_LIMITS } from "@/types";

interface SubscriptionStore {
  tier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  expiresAt: string | null;

  setSubscription: (
    tier: SubscriptionTier,
    stripeCustomerId?: string | null,
    stripeSubscriptionId?: string | null,
    expiresAt?: string | null,
  ) => void;
  hasFeature: (feature: string) => boolean;
  isExpired: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  tier: "free",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  expiresAt: null,

  setSubscription: (tier, stripeCustomerId, stripeSubscriptionId, expiresAt) => {
    set({
      tier,
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      expiresAt: expiresAt ?? null,
    });
  },

  hasFeature: (feature) => {
    const { tier, isExpired } = get();
    if (isExpired()) return false;
    return TIER_LIMITS[tier].features.includes(feature);
  },

  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  },
}));
