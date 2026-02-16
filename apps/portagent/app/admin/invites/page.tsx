"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InviteCode {
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Load invites on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadInvites defined after useEffect
  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const response = await fetch("/api/admin/invites");

      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (!response.ok) {
        setError("Failed to load invites");
        return;
      }

      const data = await response.json();
      setInvites(data.invites);
    } catch {
      setError("An error occurred");
    }
  };

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    setNewCode(null);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
      });

      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (!response.ok) {
        setError("Failed to generate invite code");
        return;
      }

      const data = await response.json();
      setNewCode(data.code);

      // Reload invites list
      await loadInvites();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Invite Code Management</h1>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Invite Code</CardTitle>
            <CardDescription>Create a new invite code for a user to sign up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </Button>

            {newCode && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-1">New invite code:</p>
                <p className="text-2xl font-mono font-bold">{newCode}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Invite Codes</CardTitle>
            <CardDescription>List of all generated invite codes and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-muted-foreground">No invite codes yet.</p>
            ) : (
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.code}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-mono font-medium">{invite.code}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(invite.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {invite.used_by ? (
                        <span className="text-xs px-2 py-1 bg-muted rounded">Used</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
