"use client";

import { useState } from "react";
import { forcePasswordReset, deleteUser } from "@/app/actions/user-management";
import { useRouter } from "next/navigation";

export default function UserRow({ user }: { user: any }) {
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!newPassword) return alert("Enter a password");
    setIsUpdating(true);
    try {
      await forcePasswordReset(user.id, newPassword);
      alert(`Password updated!`);
      setNewPassword("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      await deleteUser(user.id);
      router.refresh(); // Refresh the server component data
    } catch (err: any) {
      alert(err.message);
      setIsUpdating(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.email}</td>
      <td className="px-6 py-4 text-sm text-slate-500 font-mono text-xs">{user.id}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end items-center gap-3">
          {/* Password Reset Section */}
          <input
            type="text"
            placeholder="New PW"
            className="border rounded px-2 py-1 text-xs w-24"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            onClick={handleReset}
            disabled={isUpdating}
            className="bg-slate-800 text-white text-xs px-3 py-1 rounded hover:bg-black"
          >
            Reset
          </button>

          {/* Delete Section with Confirmation */}
          {!isConfirmingDelete ? (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="text-red-600 hover:text-red-800 text-xs font-semibold px-2"
            >
              Delete
            </button>
          ) : (
            <div className="flex gap-2 items-center bg-red-50 p-1 rounded border border-red-200">
              <span className="text-[10px] font-bold text-red-700 uppercase px-1">Are you sure?</span>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white text-[10px] px-2 py-1 rounded hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="text-slate-500 text-[10px] hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}