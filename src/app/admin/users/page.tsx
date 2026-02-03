export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseAdmin } from "@/lib/supabase/admin";
import UserRow from "@/components/admin/UserRow";
import CreateUserForm from "@/components/admin/CreateUserForm";
import Link from "next/link"; // Added this import

export default async function AdminUsersPage() {
  // Fetch users from the auth schema using the Admin SDK
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  
  // Destructure users safely with a fallback to an empty array
  const users = data?.users || [];

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Updated Header with Navigation */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Add, reset, or remove Bastion players.</p>
        </div>
        
        <Link 
          href="/" 
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
        >
          ← Back to Home
        </Link>
      </header>

      {/* The form we added in the previous step */}
      <CreateUserForm />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold text-slate-700">Email</th>
              <th className="px-6 py-3 text-sm font-semibold text-slate-700">User ID</th>
              <th className="px-6 py-3 text-sm font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                  No players found. Use the form above to add one.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}