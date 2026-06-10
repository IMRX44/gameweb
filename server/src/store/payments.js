// Pluggable payments provider.
//
// Cosmetics are bought with in-game "Nebula Crystals". Crystals themselves can
// be bought with real money via a payment provider. This module exposes a tiny
// interface so you can drop in Stripe (or any PSP) later without touching the
// rest of the server.
//
// By default it uses a SANDBOX provider that instantly "succeeds" so the whole
// flow is testable locally with no keys and no real charges.
//
// To go live: set PAYMENTS_PROVIDER=stripe and STRIPE_SECRET_KEY, then implement
// createCheckout/handleWebhook with the Stripe SDK. The crystal-granting logic
// stays identical.

import { CRYSTAL_BUNDLES } from '@nebula/shared/cosmetics.js';
import { grantCrystals } from './accounts.js';

const bundleById = new Map(CRYSTAL_BUNDLES.map((b) => [b.id, b]));

class SandboxProvider {
  constructor() {
    this.name = 'sandbox';
  }

  // Returns a fake checkout that the client can "complete" immediately.
  async createCheckout({ bundleId, token }) {
    const bundle = bundleById.get(bundleId);
    if (!bundle) return { ok: false, error: 'unknown_bundle' };
    return {
      ok: true,
      provider: this.name,
      checkoutId: `sandbox_${bundleId}_${Date.now()}`,
      // In sandbox we expose a direct confirm endpoint instead of a hosted page.
      sandbox: true,
      bundle,
      token,
    };
  }

  // In sandbox, "completing" a checkout just grants the crystals.
  async confirm({ checkoutId, bundleId, token }) {
    const bundle = bundleById.get(bundleId);
    if (!bundle) return { ok: false, error: 'unknown_bundle' };
    const total = bundle.crystals + bundle.bonus;
    const res = grantCrystals(token, total);
    if (!res.ok) return res;
    return { ok: true, granted: total, account: res.account, checkoutId };
  }
}

// Placeholder for the real provider — interface-compatible with SandboxProvider.
class StripeProvider {
  constructor() {
    this.name = 'stripe';
    // const Stripe = (await import('stripe')).default;
    // this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  async createCheckout() {
    return { ok: false, error: 'stripe_not_configured' };
  }
  async confirm() {
    return { ok: false, error: 'stripe_not_configured' };
  }
}

export function createPaymentsProvider() {
  if (process.env.PAYMENTS_PROVIDER === 'stripe') return new StripeProvider();
  return new SandboxProvider();
}

export { CRYSTAL_BUNDLES };
