// Thin REST client for accounts, shop and payments.
import type { Account, Cosmetic, CrystalBundle } from './types';

const TOKEN_KEY = 'nebula.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-token': token } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && (data.error as string)) || `http_${res.status}`);
  }
  return data as T;
}

export async function authGuest(name?: string): Promise<Account> {
  const data = await req<{ token: string; account: Account }>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ token: getToken(), name }),
  });
  setToken(data.token);
  return data.account;
}

export async function fetchMe(): Promise<Account> {
  const data = await req<{ account: Account }>('/me');
  return data.account;
}

export async function setName(name: string): Promise<Account> {
  const data = await req<{ account: Account }>('/me/name', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return data.account;
}

export async function fetchShop(): Promise<{ cosmetics: Cosmetic[]; bundles: CrystalBundle[] }> {
  return req('/shop');
}

export async function buyCosmetic(cosmeticId: string): Promise<Account> {
  const data = await req<{ account: Account }>('/shop/buy', {
    method: 'POST',
    body: JSON.stringify({ cosmeticId }),
  });
  return data.account;
}

export async function setLoadout(slot: string, cosmeticId: string): Promise<Account> {
  const data = await req<{ account: Account }>('/me/loadout', {
    method: 'POST',
    body: JSON.stringify({ slot, cosmeticId }),
  });
  return data.account;
}

// Buy crystals. In sandbox this resolves instantly; with a real PSP it would
// redirect to a hosted checkout and complete via webhook.
export async function buyCrystals(bundleId: string): Promise<Account> {
  const checkout = await req<{ checkoutId: string; sandbox?: boolean }>('/pay/checkout', {
    method: 'POST',
    body: JSON.stringify({ bundleId }),
  });
  const data = await req<{ account: Account }>('/pay/confirm', {
    method: 'POST',
    body: JSON.stringify({ checkoutId: checkout.checkoutId, bundleId }),
  });
  return data.account;
}
