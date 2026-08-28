"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Status = "checking" | "connected" | "not-configured" | "error";

export default function SupabaseStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      setStatus("not-configured");
      return;
    }

    client.auth
      .getSession()
      .then(({ error }) => {
        setStatus(error ? "error" : "connected");
      })
      .catch(() => setStatus("error"));
  }, []);

  const label: Record<Status, string> = {
    checking: "Supabase 연결 확인 중...",
    connected: "Supabase 연결됨",
    "not-configured": "Supabase 환경변수 미설정",
    error: "Supabase 연결 실패",
  };

  const className: Record<Status, string> = {
    checking: "status warn",
    connected: "status ok",
    "not-configured": "status warn",
    error: "status error",
  };

  return <span className={className[status]}>{label[status]}</span>;
}
