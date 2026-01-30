"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();

    // This ensures the session is established if tokens are in the URL.
    supabase.auth.getSession().then(() => {
      router.replace("/");
    });
  }, [router]);

  return <div className="p-6">Signing you in…</div>;
}
