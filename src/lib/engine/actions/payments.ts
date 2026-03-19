/**
 * Handle a payment create action.
 * In v1, this simply deducts from the wallet. It does NOT create a real
 * Stripe charge on behalf of the agent — it records an internal payment event.
 */
export async function handlePaymentCreate(
  params: Record<string, unknown>,
  context: { agentId: string; ownerId: string }
): Promise<Record<string, unknown>> {
  const amountCents = Number(params.amount_cents);
  if (!amountCents || amountCents <= 0) {
    throw new Error("Invalid amount_cents parameter");
  }

  const description =
    typeof params.description === "string"
      ? params.description
      : "Agent payment";
  const recipient =
    typeof params.recipient === "string" ? params.recipient : "internal";

  return {
    type: "payment",
    amount_cents: amountCents,
    description,
    recipient,
    agent_id: context.agentId,
    timestamp: new Date().toISOString(),
  };
}
