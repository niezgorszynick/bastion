"use client";

import { useRef } from "react";
import { createNewUser } from "@/app/actions/user-management";

export default function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const clientAction = async (formData: FormData) => {
    try {
      await createNewUser(formData);
      formRef.current?.reset();
      alert("User created successfully!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <form 
      ref={formRef} 
      action={clientAction}
      className="bg-white p-6 rounded-lg border border-slate-200 mb-8 flex flex-wrap gap-4 items-end"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
        <input 
          name="email" 
          type="email" 
          required 
          className="border rounded px-3 py-2 text-sm w-64"
          placeholder="player@example.com"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-slate-500 uppercase">Initial Password</label>
        <input 
          name="password" 
          type="password" 
          required 
          className="border rounded px-3 py-2 text-sm w-64"
          placeholder="••••••••"
        />
      </div>
      <button 
        type="submit" 
        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 transition-colors"
      >
        + Add Player
      </button>
    </form>
  );
}