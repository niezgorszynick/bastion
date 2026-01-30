"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    // initial load
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });

    // listen for auth changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
        setEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function createCampaign() {
    if (!userId) return alert("Login first");

    const res = await fetch("/api/campaigns/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId, // temporary MVP auth
      },
      body: JSON.stringify({ name: "My Bastion", width: 64, height: 64 }),
    });

    const json = await res.json();
    if (!res.ok) return alert(json.error || "Failed");

    setCampaignId(json.campaign.id);
  }

  async function logout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    setCampaignId(null);
  }

  return (
    <div className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link className="underline" href="/login">
          Login
        </Link>

        {userId && (
          <>
            <span className="text-sm text-gray-700">
              Logged in as <strong>{email}</strong>
            </span>
            <button
              className="border rounded px-3 py-1 text-sm"
              onClick={logout}
            >
              Logout
            </button>
          </>
        )}

        {campaignId && (
          <Link className="underline" href={`/campaign/${campaignId}`}>
            Open Campaign
          </Link>
        )}
      </div>

      {/* Main action */}
      <button
        className="border rounded px-3 py-2"
        onClick={createCampaign}
        disabled={!userId}
      >
        Create Campaign + Map
      </button>

      {!userId && (
        <p className="text-sm text-gray-600">
          Login first, then create a campaign.
        </p>
      )}
    </div>
  );
}
