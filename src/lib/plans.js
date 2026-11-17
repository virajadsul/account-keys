// Plans an account can be on. Only Free exists today; the two paid tiers get added
// here (label, key limit, and an end date if they have one) when they're decided.
export const PLANS = {
  free: { label: "Free", maxKeys: 5 },
};

export const DEFAULT_PLAN = "free";
export const planLabel = (id) => PLANS[id]?.label || id;
export const maxKeysFor = (id) => PLANS[id]?.maxKeys ?? PLANS[DEFAULT_PLAN].maxKeys;
