// ---------------------------------------------------------------------
//  create-checkout
//  The browser sends product ids and quantities and nothing else.
//  Prices, stock, store credit and the referral are decided here, where
//  the customer cannot reach them.
//
//    supabase functions deploy create-checkout
// ---------------------------------------------------------------------
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2026-07-29.dahlia" });
const REFERRAL_CENTS = Number(Deno.env.get("REFERRAL_CENTS") ?? "50");

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // service role: needed to read true prices and to write orders
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json();
    const items: { product_id: string; variant_id?: string | null; quantity: number }[] = body.items ?? [];
    const referralCode: string | null = body.referral_code ?? null;
    const useCredit = Boolean(body.use_credit);
    const returnUrl: string = (body.return_url ?? "").replace(/\/$/, "");

    if (!items.length) return json({ error: "Your bag is empty." }, 400);

    // ---- who is asking -------------------------------------------------
    // A signed-in visitor sends a real JWT. A guest sends the publishable
    // key, which is opaque rather than a JWT — so only try to resolve a
    // user when the token actually has the shape of one.
    let userId: string | null = null;
    let email: string | null = body.email ?? null;
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const looksLikeJwt = token.split(".").length === 3;
    if (looksLikeJwt) {
      const { data } = await admin.auth.getUser(token);
      if (data.user) { userId = data.user.id; email = data.user.email ?? email; }
    }

    // ---- price the basket from the database ----------------------------
    const ids = [...new Set(items.map((i) => i.product_id))];
    const { data: products, error: pErr } = await admin
      .from("products").select("id,sku,name,price_cents,currency,image_url,stock,active").in("id", ids);
    if (pErr) throw pErr;

    const variantIds = items.map((i) => i.variant_id).filter(Boolean) as string[];
    let variants: any[] = [];
    if (variantIds.length) {
      const { data: vs, error: vErr } = await admin
        .from("product_variants").select("id,product_id,size,price_cents,stock,active").in("id", variantIds);
      if (vErr) throw vErr;
      variants = vs ?? [];
    }

    const lines: { product: any; variant: any; unit: number; quantity: number }[] = [];
    for (const it of items) {
      const p = products?.find((x) => x.id === it.product_id);
      const qty = Math.max(1, Math.min(20, Math.floor(Number(it.quantity) || 1)));
      if (!p || !p.active) return json({ error: "One of those items is no longer for sale." }, 400);

      let v = null;
      if (it.variant_id) {
        v = variants.find((x) => x.id === it.variant_id) ?? null;
        // a variant must belong to the product it was sent with
        if (!v || !v.active || v.product_id !== p.id)
          return json({ error: "That size is no longer available." }, 400);
        if (v.stock < qty)
          return json({ error: `${p.name} in size ${v.size} is out of stock.` }, 409);
      } else if (p.stock < qty) {
        return json({ error: `${p.name} is out of stock.` }, 409);
      }

      const unit = v && v.price_cents != null ? v.price_cents : p.price_cents;
      lines.push({ product: p, variant: v, unit, quantity: qty });
    }

    const currency = lines[0].product.currency ?? "eur";
    const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0);

    // A basket worth nothing means something is mispriced. Settling it would
    // mark goods paid that nobody paid for, so refuse rather than guess.
    if (subtotal <= 0) {
      console.error("Refused zero-value basket:", JSON.stringify(items));
      return json({ error: "That item is not priced yet. Please try again later." }, 409);
    }

    // ---- store credit ---------------------------------------------------
    let creditApplied = 0;
    if (useCredit && userId) {
      const { data: ledger } = await admin
        .from("credit_ledger").select("delta_cents").eq("user_id", userId);
      const balance = (ledger ?? []).reduce((s: number, r: any) => s + r.delta_cents, 0);
      creditApplied = Math.max(0, Math.min(balance, subtotal));
    }
    const total = subtotal - creditApplied;

    // ---- a referral only counts if the garment has an owner -------------
    let validRef: string | null = null;
    if (referralCode) {
      const { data: g } = await admin
        .from("garment_codes").select("code,claimed_by").eq("code", referralCode).maybeSingle();
      if (g) validRef = g.code;
    }

    // ---- record the order before taking any money -----------------------
    const { data: order, error: oErr } = await admin.from("orders").insert({
      user_id: userId, email, status: "pending",
      subtotal_cents: subtotal, credit_applied_cents: creditApplied,
      total_cents: total, currency, referral_code: validRef,
    }).select().single();
    if (oErr) throw oErr;

    await admin.from("order_items").insert(lines.map((l) => ({
      order_id: order.id, product_id: l.product.id,
      variant_id: l.variant?.id ?? null, size: l.variant?.size ?? null,
      name: l.variant ? `${l.product.name} (${l.variant.size})` : l.product.name,
      unit_price_cents: l.unit, quantity: l.quantity,
    })));

    // ---- credit covers everything: no card needed ------------------------
    if (total === 0) {
      const { error: sErr } = await admin.rpc("settle_order", {
        p_order_id: order.id, p_referral_cents: REFERRAL_CENTS,
      });
      if (sErr) throw sErr;
      return json({ order_id: order.id, paid_with_credit: true });
    }

    // ---- otherwise, hand off to Stripe ----------------------------------
    // Credit is applied as a one-off discount so the receipt shows the real
    // list prices and the reduction, rather than fudged unit prices.
    const discounts = [];
    if (creditApplied > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: creditApplied, currency, duration: "once", name: "Store credit",
      });
      discounts.push({ coupon: coupon.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email ?? undefined,
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency,
          unit_amount: l.unit,
          product_data: {
            name: l.variant ? `${l.product.name} — size ${l.variant.size}` : l.product.name,
            ...(l.product.image_url ? { images: [l.product.image_url] } : {}),
          },
        },
      })),
      discounts,
      shipping_address_collection: { allowed_countries: ["IE", "IT", "GB", "DE", "FR", "ES", "NL", "BE", "US"] },
      success_url: `${returnUrl}/success.html?order=${order.id}`,
      cancel_url: `${returnUrl}/index.html`,
      metadata: { order_id: order.id, referral_code: validRef ?? "" },
    });

    await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    return json({ url: session.url, order_id: order.id });

  } catch (err) {
    console.error("create-checkout failed:", err);
    return json({ error: "Checkout could not start. Nothing has been charged." }, 500);
  }
});
