// ---------------------------------------------------------------------
//  stripe-webhook
//  Stripe tells us the money actually arrived. Only then does the order
//  become paid, the credit get spent, and the wearer get their cut.
//
//    supabase functions deploy stripe-webhook --no-verify-jwt
//
//  The --no-verify-jwt matters: Stripe has no Supabase token. The request
//  is authenticated instead by its signature, checked below.
// ---------------------------------------------------------------------
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2026-07-29.dahlia" });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const REFERRAL_CENTS = Number(Deno.env.get("REFERRAL_CENTS") ?? "50");

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // signature verification needs the untouched body, so read it as text
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error("Signature rejected:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") break;

        const orderId = session.metadata?.order_id;
        if (!orderId) { console.error("Session carried no order id:", session.id); break; }

        // Stripe moved shipping details under collected_information in newer
        // API versions; read either shape so an account upgrade can't silently
        // stop addresses arriving.
        const ship =
          (session as any).collected_information?.shipping_details ??
          (session as any).shipping_details ??
          null;
        if (ship?.address) {
          await admin.from("orders").update({
            ship_name: ship.name ?? session.customer_details?.name ?? null,
            ship_address: ship.address,
          }).eq("id", orderId);
        } else {
          console.warn("No shipping address on session", session.id);
        }

        const { error } = await admin.rpc("settle_order", {
          p_order_id: orderId, p_referral_cents: REFERRAL_CENTS,
        });
        if (error) throw error;
        console.log("Settled order", orderId);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.order_id) {
          await admin.from("orders").update({ status: "cancelled" })
            .eq("id", session.metadata.order_id).eq("status", "pending");
        }
        break;
      }
    }
  } catch (err) {
    // A non-2xx makes Stripe retry, which is what we want: settle_order is
    // idempotent, so a replay is harmless.
    console.error("Handler failed:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
