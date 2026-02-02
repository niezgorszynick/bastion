"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createNewUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm so they can log in immediately
  });

  if (error) {
    throw new Error(error.message);
  }

  // This tells Next.js to refresh the data on the admin page
  revalidatePath("/admin/users");
  return { success: true };
}

// Force a password update for an existing user
export async function forcePasswordReset(userId: string, newPass: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPass }
  );

  if (error) throw error;
  return data.user;
}

export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}

