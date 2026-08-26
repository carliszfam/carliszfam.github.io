import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CFG = window.SHOP_CONFIG;
export const sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
export const cfg = CFG;

/* ---------------- money ---------------- */
export const money = (cents, cur = CFG.CURRENCY) =>
  new Intl.NumberFormat(CFG.LOCALE, { style: "currency", currency: cur.toUpperCase() })
    .format((cents || 0) / 100);

/* ---------------- referral code ----------------
   A scanned garment code follows the buyer for 30 days. */
const REF_KEY = "shop.ref";
export function rememberRef(code) {
  if (!code) return;
  localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }));
}
export function currentRef() {
  try {
    const r = JSON.parse(localStorage.getItem(REF_KEY) || "null");
    if (!r) return null;
    if (Date.now() - r.at > 30 * 864e5) { localStorage.removeItem(REF_KEY); return null; }
    return r.code;
  } catch { return null; }
}

/* ---------------- cart ---------------- */
const CART_KEY = "shop.cart";
export const readCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
};
const writeCart = (c) => {
  localStorage.setItem(CART_KEY, JSON.stringify(c));
  document.dispatchEvent(new CustomEvent("cart:changed"));
};
/* A line is identified by its variant when the product has sizes, and by
   the product itself when it doesn't. Two sizes of one shirt are two lines. */
export const lineKey = (l) => l.variant_id || l.product_id;

export function addToCart(productId, variantId = null, qty = 1) {
  const cart = readCart();
  const key = variantId || productId;
  const hit = cart.find((l) => lineKey(l) === key);
  if (hit) hit.qty += qty;
  else cart.push({ product_id: productId, variant_id: variantId, qty });
  writeCart(cart);
}
export function setQty(key, qty) {
  let cart = readCart();
  if (qty <= 0) cart = cart.filter((l) => lineKey(l) !== key);
  else { const hit = cart.find((l) => lineKey(l) === key); if (hit) hit.qty = qty; }
  writeCart(cart);
}
export const clearCart = () => writeCart([]);
export const cartCount = () => readCart().reduce((n, l) => n + l.qty, 0);

/* ---------------- data ---------------- */
export async function fetchProducts() {
  // Two plain queries rather than an embedded join. PostgREST embedding
  // depends on its cached view of foreign keys, which lags behind a fresh
  // migration; stitching client-side has no such dependency and costs one
  // extra round trip on a catalogue this size.
  const { data: products, error } = await sb.from("products")
    .select("*").eq("active", true)
    .order("collection").order("position").order("created_at");
  if (error) throw error;
  if (!products?.length) return [];

  let variants = [];
  const { data: vs, error: vErr } = await sb.from("product_variants")
    .select("id,product_id,size,sku,price_cents,stock,position,active")
    .in("product_id", products.map((p) => p.id));
  // A missing variants table must not take the whole shop down.
  if (vErr) console.warn("Variants unavailable, showing items unsized:", vErr.message);
  else variants = vs || [];

  return products.map((p) => ({
    ...p,
    variants: variants
      .filter((v) => v.product_id === p.id && v.active)
      .sort((a, b) => a.position - b.position),
  }));
}

/* A variant may override the price; otherwise it inherits. */
export const priceOf = (p, v) => (v && v.price_cents != null ? v.price_cents : p.price_cents);

/* Total stock across sizes, or the product's own when it has none. */
export const stockOf = (p) =>
  p.variants?.length ? p.variants.reduce((n, v) => n + v.stock, 0) : p.stock;

export async function fetchBalance() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return 0;
  const { data, error } = await sb.rpc("my_credit_balance");
  if (error) return 0;
  return data || 0;
}

/* ---------------- auth ---------------- */
export async function currentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}
export const signIn  = (email, password) => sb.auth.signInWithPassword({ email, password });
export const signUp  = (email, password, display_name) =>
  sb.auth.signUp({ email, password, options: { data: { display_name } } });
export const signOut = () => sb.auth.signOut();

/* ---------------- checkout ----------------
   The browser sends only product ids and quantities. Prices, credit
   and the referral payout are all recomputed server-side. */
export async function startCheckout({ useCredit = false, email = null } = {}) {
  const items = readCart();
  if (!items.length) throw new Error("Your bag is empty.");

  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${CFG.SUPABASE_URL}/functions/v1/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CFG.SUPABASE_KEY,
      Authorization: `Bearer ${session?.access_token || CFG.SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      items: items.map((l) => ({
        product_id: l.product_id, variant_id: l.variant_id || null, quantity: l.qty })),
      referral_code: currentRef(),
      use_credit: useCredit,
      email,
      return_url: CFG.SITE_URL,
    }),
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Checkout could not start. Try again.");

  clearCart();
  if (out.url) window.location.href = out.url;          // pay at Stripe
  else window.location.href = `${CFG.SITE_URL}/success.html?order=${out.order_id}`; // covered by credit
}

/* ---------------- shared chrome ---------------- */
export function mountMasthead(el, { active = "" } = {}) {
  el.innerHTML = `
    <div class="masthead-in">
      <a class="redaction" href="./index.html">${CFG.BRAND}</a>
      <nav class="masthead-nav">
        <span class="chip chip-credit hide" id="creditChip">Credit <b id="creditVal">—</b></span>
        <button class="chip" id="accountChip">Account</button>
        <button class="chip chip-cart" id="cartChip">Bag <span id="cartCount">0</span></button>
      </nav>
    </div>`;
  el.dataset.active = active;
}

export async function refreshCredit() {
  const chip = document.getElementById("creditChip");
  const val = document.getElementById("creditVal");
  if (!chip || !val) return;
  const user = await currentUser();
  if (!user) { chip.classList.add("hide"); return; }
  const bal = await fetchBalance();
  val.textContent = money(bal);
  chip.classList.toggle("hide", bal <= 0);
}

export function refreshCartCount() {
  const n = document.getElementById("cartCount");
  if (n) n.textContent = String(cartCount());
}

/* ---------------- horizontal rails ---------------- */
export function renderRail(mount, { title, note, products }) {
  const railId = `rail-${Math.random().toString(36).slice(2, 8)}`;
  const section = document.createElement("section");
  section.className = "rail-block";
  section.innerHTML = `
    <div class="rail-head">
      <h2>${title}</h2>
      <span class="tag">${note || `${products.length} styles`}</span>
      <div class="rail-arrows">
        <button class="arrow" data-dir="-1" aria-label="Scroll ${title} left">&#8592;</button>
        <button class="arrow" data-dir="1"  aria-label="Scroll ${title} right">&#8594;</button>
      </div>
    </div>
    <div class="rail" id="${railId}" tabindex="0" role="region" aria-label="${title}"></div>`;

  const rail = section.querySelector(".rail");
  products.forEach((p) => rail.appendChild(productCard(p)));
  section.querySelectorAll(".arrow").forEach((b) =>
    b.addEventListener("click", () =>
      rail.scrollBy({ left: Number(b.dataset.dir) * (rail.clientWidth * 0.8), behavior: "smooth" })));

  mount.appendChild(section);
}

export function productCard(p) {
  const el = document.createElement("article");
  el.className = "card";
  const sized = (p.variants || []).length > 0;
  const inStock = stockOf(p) > 0;
  let chosen = sized ? (p.variants.find((v) => v.stock > 0) || null) : null;

  el.innerHTML = `
    <div class="card-shot">${
      p.image_url
        ? `<img src="${p.image_url}" alt="${escapeHtml(p.name)}" loading="lazy">`
        : `<span class="redaction redaction-lg">${cfg.BRAND}</span>`}</div>
    <div class="card-body">
      <span class="tag">${escapeHtml(p.sku)}</span>
      <span class="card-name">${escapeHtml(p.name)}</span>
      ${p.blurb ? `<p class="card-blurb">${escapeHtml(p.blurb)}</p>` : ""}
      ${sized ? `<div class="size-row">${p.variants.map((v) => `
        <button class="size" data-v="${v.id}" ${v.stock <= 0 ? "disabled" : ""}
          aria-pressed="${chosen && chosen.id === v.id}"
          title="${v.stock > 0 ? `${v.stock} left` : "Sold out"}">${escapeHtml(v.size)}</button>`).join("")}</div>` : ""}
      <div class="card-foot">
        <span class="price ${inStock ? "" : "sold-out"}" data-price>${
          inStock ? money(priceOf(p, chosen), p.currency) : "Sold out"}</span>
        <button class="btn btn-hollow btn-slim" data-add style="margin-left:auto" ${inStock ? "" : "disabled"}>Add</button>
      </div>
    </div>`;

  const priceEl = el.querySelector("[data-price]");
  const addBtn  = el.querySelector("[data-add]");

  el.querySelectorAll(".size").forEach((b) =>
    b.addEventListener("click", () => {
      chosen = p.variants.find((v) => v.id === b.dataset.v);
      el.querySelectorAll(".size").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      priceEl.textContent = money(priceOf(p, chosen), p.currency);
    }));

  if (inStock) addBtn.addEventListener("click", () => {
    if (sized && !chosen) { addBtn.textContent = "Pick a size"; setTimeout(() => (addBtn.textContent = "Add"), 1400); return; }
    addToCart(p.id, chosen?.id || null);
    addBtn.textContent = "Added";
    setTimeout(() => (addBtn.textContent = "Add"), 1100);
  });

  return el;
}

export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
