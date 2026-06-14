import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status === "ok" ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      {status === "loading" && <p>Connecting to server...</p>}
      {status === "ok" && <p>Server: OK</p>}
      {status === "error" && <p>Server unreachable</p>}
    </main>
  );
}
