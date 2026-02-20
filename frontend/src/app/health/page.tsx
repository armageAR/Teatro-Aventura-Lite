"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

export default function HealthPage() {
  const [status, setStatus] = useState<unknown>(null);

  useEffect(() => {
    api
      .get("/api/health")
      .then((res) => setStatus(res.data))
      .catch((err) => setStatus({ error: err.message }));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Health Check 1</h1>
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
