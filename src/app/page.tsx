"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const fetchAllCampaigns = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  useEffect(() => {
    const supabase = supabaseBrowser();
    const sync = (u: any) => {
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      setIsAdmin(u?.email === adminEmail);
      if (u) fetchAllCampaigns();
    };

    supabase.auth.getUser().then(({ data }) => sync(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [adminEmail]);

  async function handleCreate() {
    if (!userId || !newCampaignName.trim()) return;
    setIsCreating(true);
    
    const supabase = supabaseBrowser();

    // 1. Create the Campaign
    const { data: campaign, error: cError } = await supabase
      .from("campaigns")
      .insert({ name: newCampaignName, owner_id: userId })
      .select()
      .single();

    if (cError) {
      alert("Campaign Error: " + cError.message);
    } else {
      
      // 2. Create the Map (Chained to the campaign success)
      const { error: mError } = await supabase
        .from("maps")
        .insert({ 
        campaign_id: campaign.id, 
        grid_data: [],
        width: 64,  // Add this
        height: 64  // Add this
  });

      if (mError) {
        // Safe string logging
        console.error("Map Init Failed: " + mError.message);
      }
      
      // Refresh the list and clear input
      await fetchAllCampaigns();
      setNewCampaignName("");
    }
    setIsCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Dismantle this Bastion?")) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchAllCampaigns();
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-extrabold text-slate-900">Bastion Builder</h1>
        <p className="text-slate-500 italic">D&D 2024 Base Management</p>
      </header>

      <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-between shadow-sm">
        {!userId ? (
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Login</Link>
        ) : (
          <div className="flex items-center gap-4 w-full">
            <span className="text-sm font-medium">Player: {email}</span>
            <div className="ml-auto flex gap-3">
              {isAdmin && <Link href="/admin/users" className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold">🛡️ Admin</Link>}
              <button onClick={() => supabaseBrowser().auth.signOut()} className="text-xs border px-2 py-1 rounded bg-white">Logout</button>
            </div>
          </div>
        )}
      </div>

      {userId && (
        <section className="space-y-4 p-6 border rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">New Bastion</h2>
          <div className="flex gap-2">
            <input 
              className="border rounded-lg px-4 py-2 flex-1 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name..."
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
            />
            <button 
              onClick={handleCreate}
              disabled={isCreating || !newCampaignName.trim()}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {isCreating ? "Establishing..." : "Establish"}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Existing Bastions</h2>
        <div className="grid gap-3">
          {campaigns.map((camp) => (
            <div key={camp.id} className="group flex items-center justify-between p-4 border rounded-xl bg-white hover:border-blue-500 transition-all shadow-sm">
              <Link href={`/campaign/${camp.id}`} className="flex-1">
                <h3 className="font-bold text-slate-900">{camp.name}</h3>
                <p className="text-xs text-slate-400">{camp.owner_id === userId ? "Your Stronghold" : "Ally Bastion"}</p>
              </Link>
              {camp.owner_id === userId && (
                <button onClick={() => handleDelete(camp.id)} className="text-slate-300 hover:text-red-500 p-2">✕</button>
              )}
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-slate-400 italic">No bastions found.</p>}
        </div>
      </section>
    </main>
  );
}