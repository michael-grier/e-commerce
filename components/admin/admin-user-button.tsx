"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function AdminUserButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <span aria-hidden="true" className="size-8 rounded-full bg-muted" />;
  }

  return <UserButton />;
}
