"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCode } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getCode()) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
