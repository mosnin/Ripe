/**
 * Echo tool — returns whatever is sent. Free action for testing.
 */
export async function handleToolsEcho(
  params: Record<string, unknown>,
  context: { agentId: string; ownerId: string }
): Promise<Record<string, unknown>> {
  return {
    type: "echo",
    echo: params,
    agent_id: context.agentId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock API tool — simulates an outbound API call with latency.
 */
export async function handleToolsMockApi(
  params: Record<string, unknown>,
  context: { agentId: string; ownerId: string }
): Promise<Record<string, unknown>> {
  const url =
    typeof params.url === "string" ? params.url : "https://api.example.com";
  const method =
    typeof params.method === "string" ? params.method : "GET";

  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

  return {
    type: "mock_api",
    url,
    method,
    status_code: 200,
    response_body: { ok: true, mock: true },
    agent_id: context.agentId,
    timestamp: new Date().toISOString(),
  };
}
