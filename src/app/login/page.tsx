"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // Email or Username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    const supabase = supabaseBrowser();
    
    // Logic: If it doesn't look like an email, we'd normally query a 
    // public 'profiles' table here to find the email linked to a username.
    // For now, let's assume 'identifier' is the email for the MVP.
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      window.location.href = "/"; // Redirect on success
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!identifier.includes("@")) {
      return setMessage("Please enter your email to reset password.");
    }
    
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) setMessage(error.message);
    else setMessage("Reset link sent to your email!");
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4 flex flex-col border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold">Bastion Login</h1>
      
      <input
        className="border rounded px-3 py-2 w-full text-black"
        placeholder="Email or Username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <input
        className="border rounded px-3 py-2 w-full text-black"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white rounded px-3 py-2 w-full disabled:opacity-50"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Authenticating..." : "Sign In"}
      </button>

      <button
        className="text-sm text-gray-500 hover:underline"
        onClick={handleResetPassword}
      >
        Forgot Password?
      </button>

      {message && <p className="text-sm text-red-500">{message}</p>}
    </div>
  );
}