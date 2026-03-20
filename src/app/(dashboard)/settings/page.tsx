import { requireAuth } from "@/lib/auth/clerk";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information managed by Clerk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
              <div className="flex items-center gap-2">
                <code className="bg-[var(--muted)] px-2 py-0.5 rounded text-xs">
                  {user.id}
                </code>
                <CopyButton value={user.id} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how Ripe looks</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card className="mb-4">
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
              <div className="flex items-center gap-2">
                <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded block">
                  POST /api/v1/agent/execute
                </code>
                <CopyButton value="POST /api/v1/agent/execute" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Authentication</p>
              <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded block">
                Authorization: Bearer ripe_ak_...
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Example Request</p>
              <div className="relative">
                <pre className="text-xs bg-[var(--muted)] p-3 rounded overflow-x-auto">
{`{
  "action": "tools:echo",
  "params": {
    "message": "Hello from my agent!"
  }
}`}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton value={`{\n  "action": "tools:echo",\n  "params": {\n    "message": "Hello from my agent!"\n  }\n}`} />
                </div>
              </div>
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
                  permission, free)
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

      {/* Danger zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
