"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Site {
  id: string;
  domain: string;
  name: string;
  created_at: string;
}

export function SitesManager({ initialSites }: { initialSites: Site[] }) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, name: name || domain }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Failed to add site");
      return;
    }

    const { site } = await res.json();
    setSites((prev) => [...prev, site]);
    setDomain("");
    setName("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/sites?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to remove site");
      return;
    }
    setSites((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  function getSnippet(site: Site) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `<script defer src="${origin}/script.js" data-site="${site.domain}"></script>`;
  }

  function copySnippet(site: Site) {
    navigator.clipboard.writeText(getSnippet(site));
    toast.success("Embed snippet copied");
  }

  function copyPrompt(site: Site) {
    const prompt = `Add this analytics tracking script tag to the <head> of every page on this site (right before the closing </head> tag):\n\n${getSnippet(site)}\n\nDon't modify or wrap it — just insert it as-is.`;
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied — paste it into your AI coding tool");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a site</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                placeholder="My site"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add site"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {sites.map((site) => (
          <Card key={site.id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{site.name}</p>
                <p className="text-sm text-muted-foreground">{site.domain}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copySnippet(site)}>
                  <Copy className="size-4" />
                  Copy snippet
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyPrompt(site)}>
                  <Sparkles className="size-4" />
                  Copy as prompt
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(site.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sites.length === 0 && (
          <p className="text-sm text-muted-foreground">No sites yet — add one above.</p>
        )}
      </div>
    </div>
  );
}
