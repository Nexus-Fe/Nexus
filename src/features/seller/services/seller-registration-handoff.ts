import type { ShopRegistrationFields } from "../components/ShopRegistrationForm";

type PendingSellerRegistrationHandoff = {
  accountEmail: string;
  shop: ShopRegistrationFields;
};

let pendingHandoff: PendingSellerRegistrationHandoff | null = null;

/** Keeps the signup-to-shop handoff in memory only; CCCD is never written to browser storage. */
export function keepSellerRegistrationHandoff(accountEmail: string, shop: ShopRegistrationFields): void {
  pendingHandoff = { accountEmail: accountEmail.trim().toLocaleLowerCase("en-US"), shop: { ...shop } };
}

/** Returns the one-time handoff only to the account that verified the signup email. */
export function takeSellerRegistrationHandoff(accountEmail?: string | null): ShopRegistrationFields | null {
  if (!pendingHandoff) return null;
  const expectedEmail = accountEmail?.trim().toLocaleLowerCase("en-US");
  if (!expectedEmail || expectedEmail !== pendingHandoff.accountEmail) {
    if (expectedEmail) pendingHandoff = null;
    return null;
  }

  const shop = { ...pendingHandoff.shop };
  pendingHandoff = null;
  return shop;
}

export function clearSellerRegistrationHandoff(): void {
  pendingHandoff = null;
}
