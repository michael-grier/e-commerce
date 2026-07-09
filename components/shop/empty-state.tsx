import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  href?: Route;
  action?: string;
};

export function EmptyState({ title, description, href, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      <div className="max-w-md space-y-3">
        <h2 className="font-black text-3xl tracking-normal">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        {href && action ? (
          <Button asChild className="mt-3">
            <Link href={href}>{action}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
