import { requireAuth } from "@/lib/auth/clerk";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[var(--muted-foreground)]">
                Email
              </label>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--muted-foreground)]">
                Name
              </label>
              <p className="text-sm">{user.name ?? "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--muted-foreground)]">
                User ID
              </label>
              <p className="text-sm">
                <code className="bg-[var(--muted)] px-2 py-0.5 rounded text-xs">
                  {user.id}
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Agent execution gateway endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Endpoint</p>
              <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded block">
                POST /api/v1/agent/execute
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Authentication</p>
              <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded block">
                Authorization: Bearer ripe_ak_...
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Example Request</p>
              <pre className="text-xs bg-[var(--muted)] p-3 rounded overflow-x-auto">
{`{
  "action": "tools:echo",
  "params": {
    "message": "Hello from my agent!"
  }
}`}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Available Actions</p>
              <ul className="text-sm text-[var(--muted-foreground)] space-y-1">
                <li>
                  <code className="text-xs">payments:create</code> — Create a
                  payment (requires <code className="text-xs">payments:create</code>{" "}
                  permission)
                </li>
                <li>
                  <code className="text-xs">tools:echo</code> — Echo test tool
                  (requires <code className="text-xs">tools:execute</code>{" "}
                  permission)
                </li>
                <li>
                  <code className="text-xs">tools:mock_api</code> — Mock API call
                  (requires <code className="text-xs">tools:execute</code>{" "}
                  permission, costs 10 cents)
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
