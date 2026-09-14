import Link from "next/link";
import { BarChart3, Globe } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">WebStat</span>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-foreground">
              <BarChart3 className="size-4" />
              Dashboard
            </Link>
            <Link href="/sites" className="flex items-center gap-1.5 hover:text-foreground">
              <Globe className="size-4" />
              Sites
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 bg-muted/20 p-6">{children}</main>
    </div>
  );
}
