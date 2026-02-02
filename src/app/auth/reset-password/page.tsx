"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleUpdate = async () => {
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) setStatus(error.message);
    else setStatus("Password updated successfully! You can now log in.");
  };

  return (
    <div className="p-6 max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-bold">Set New Password</h1>
      <input
        type="password"
        className="border w-full p-2"
        placeholder="Enter new password"
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button onClick={handleUpdate} className="bg-green-600 text-white p-2 w-full">
        Update Password
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}