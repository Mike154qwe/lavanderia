"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export function FlashToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const flash = searchParams.get("flash");
    if (!flash) return;

    toast.success(decodeURIComponent(flash.replace(/\+/g, " ")));

    const params = new URLSearchParams(searchParams.toString());
    params.delete("flash");
    const newUrl = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
