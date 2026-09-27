"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const MESSAGES: Record<string, string> = {
  created: "DB를 등록했습니다.",
  updated: "정보를 수정했습니다.",
  claimed: "신청 완료! 담당자로 확정되었습니다.",
  reported: "결과를 저장했습니다.",
};

/** Shows a one-time toast for ?created=1 style flags, then cleans the URL. */
export function QueryToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const key = Object.keys(MESSAGES).find((k) => sp.get(k) === "1");
    if (!key) return;
    done.current = true;
    toast("success", MESSAGES[key]);
    const qs = new URLSearchParams(sp.toString());
    qs.delete(key);
    router.replace(qs.toString() ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sp, router, pathname, toast]);
  return null;
}
