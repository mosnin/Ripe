"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccountButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <div>
      {!showConfirm ? (
        <div>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            Permanently delete your account, all agents, API keys, and wallet data.
            This action cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setShowConfirm(true)}>
            Delete Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            This will permanently delete your account and all associated data.
          </p>
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">
              Type <strong>DELETE</strong> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE"}
              onClick={() => {
                // Account deletion would be implemented via Clerk's user deletion API
                alert("Account deletion is not yet implemented. Contact support.");
              }}
            >
              Permanently Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
