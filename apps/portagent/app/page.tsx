"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  role: "admin" | "user";
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Portagent</h1>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-muted-foreground">
                {user.email}
                {user.role === "admin" && (
                  <span className="ml-2 text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                    Admin
                  </span>
                )}
              </span>
              {user.role === "admin" && (
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/invites")}>
                  Manage Invites
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Chat Interface Placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Welcome to Portagent</h2>
          <p className="text-muted-foreground mb-6">AI Agent Chat Interface - Coming Soon</p>
          <div id="chat-interface" className="p-8 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">Chat interface will be displayed here</p>
          </div>
        </div>
      </div>
    </main>
  );
}
