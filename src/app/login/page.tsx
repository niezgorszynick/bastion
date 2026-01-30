"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function signIn() {
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (!error) setSent(true);
    else alert(error.message);
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Login</h1>
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="border rounded px-3 py-2 w-full" onClick={signIn}>
        Send magic link
      </button>
      {sent && <p className="text-sm">Check your email for the login link.</p>}
    </div>
  );
}
