import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <Badge variant="secondary">Authentication configured</Badge>
        <h1 className="font-black text-4xl tracking-normal">Admin dashboard</h1>
        <p className="text-muted-foreground text-lg">
          This area is protected by Clerk authentication and the server-side administrator
          allowlist.
        </p>
      </div>
      <section aria-labelledby="next-checkpoint" className="rounded-lg border bg-background p-6">
        <h2 className="font-bold text-xl" id="next-checkpoint">
          Next checkpoint
        </h2>
        <p className="mt-2 text-muted-foreground">
          Add read-only product and order views before introducing admin mutations.
        </p>
      </section>
    </div>
  );
}
