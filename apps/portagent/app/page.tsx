"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import type { User } from "@/components/chat/types";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return <ChatLayout user={user} />;
}
