import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

/**
 * Create a Stripe Checkout session for wallet funding.
 */
export async function createFundingSession(
  amountCents: number,
  userId: string,
  walletId: string,
  stripeCustomerId?: string | null
) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Ripe Platform Credits",
            description: `Add $${(amountCents / 100).toFixed(2)} to your wallet`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      wallet_id: walletId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?funded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?funded=false`,
  };

  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Create or retrieve a Stripe customer for a user.
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name?: string | null
) {
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { platform: "ripe" },
  });
  return customer;
}
