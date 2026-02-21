"use client";

import { useEffect, useState } from "react";

import { useApi } from "@/hooks/useApi";

export default function HealthPage() {
  const api = useApi();
  const [status, setStatus] = useState<unknown>(null);

  useEffect(() => {
    api
      .get("/api/health")
      .then((res) => setStatus(res.data))
      .catch((err) => setStatus({ error: err.message }));
  }, [api]);

  const loading = status === null;
  const ok =
    typeof status === "object" &&
    status !== null &&
    "status" in status &&
    (status as { status?: string }).status === "ok";

  return (
    <div style={{ padding: 20 }}>
      <h1>Health Check 1</h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {loading ? (
          <div
            aria-label="Cargando"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "3px solid #cbd5f5",
              borderTopColor: "#1e40af",
              animation: "spin 0.9s linear infinite",
            }}
          />
        ) : (
          <div
            aria-label={ok ? "Ok" : "Error"}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: ok ? "#16a34a" : "#dc2626",
              boxShadow: ok
                ? "0 0 10px rgba(22, 163, 74, 0.6)"
                : "0 0 10px rgba(220, 38, 38, 0.6)",
            }}
          />
        )}
        <span>{loading ? "Chequeando..." : ok ? "OK" : "Error"}</span>
      </div>
      <pre>{JSON.stringify(status, null, 2)}</pre>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
