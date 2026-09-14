"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Site {
  id: string;
  domain: string;
  name: string;
}

export function SiteSwitcher({ sites, current }: { sites: Site[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(domain: string | null) {
    if (!domain) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", domain);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (sites.length === 0) {
    return <span className="text-sm text-muted-foreground">No sites yet</span>;
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a site" />
      </SelectTrigger>
      <SelectContent>
        {sites.map((site) => (
          <SelectItem key={site.id} value={site.domain}>
            {site.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
