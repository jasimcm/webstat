import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { SitesManager } from "./sites-manager";

export default async function SitesPage() {
  const supabase = createSupabaseAdminClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, domain, name, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <SitesManager initialSites={sites ?? []} />
    </div>
  );
}
