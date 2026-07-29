/**
 * src/shop/storeLink.js
 * ============================================================================
 *  Helpers for building UTM-attributed store links and Shopify cart permalinks.
 *
 *  All store handoffs from the game go through these helpers so every click
 *  is attributable in analytics (utm_source=soycraft-world).
 * ============================================================================
 */

/** UTM params appended to every outbound store link. */
const UTM = 'utm_source=soycraft-world&utm_medium=game&utm_campaign=world_cart_handoff';

/**
 * Safely append UTM attribution params to any URL.
 * Handles URLs that already have a query string, and absolute paths.
 *
 * @param {string} url - The destination URL (absolute or relative).
 * @returns {string}
 */
export function withUtm(url) {
  if (!url) return url;
  try {
    // Use URL() for clean param handling when the URL is absolute.
    const u = new URL(url);
    UTM.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch {
    // Fallback for protocol-relative or relative paths.
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + UTM;
  }
}

/**
 * Build a Shopify cart permalink for an array of wishlist product objects.
 *
 * Products that have a numeric variantId are included as `{variantId}:1` pairs.
 * Products with variantId === null are silently skipped (they fall back to a
 * shop-page link in the wishlist panel).
 *
 * When no items have a variantId (e.g. only draft products are saved), the
 * function falls back to the shop homepage with UTM params.
 *
 * @param {Array<{variantId: number|null}>} items - Wishlist product objects.
 * @returns {string} Full cart or homepage URL with UTMs.
 */
export function buildCartUrl(items) {
  const SHOP = 'https://www.soycraft.co';
  const cartable = items.filter((i) => i.variantId != null);
  if (cartable.length === 0) {
    return withUtm(SHOP + '/');
  }
  const pairs = cartable.map((i) => `${i.variantId}:1`).join(',');
  return withUtm(`${SHOP}/cart/${pairs}`);
}
