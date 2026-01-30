import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Supabase auth will attach tokens in the URL fragment or query params.
  // In many setups you can just redirect to home and supabase-js will pick it up client-side.
  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/", url.origin));
}
