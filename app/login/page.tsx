"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("role", data.role || "secretaria");
        router.push("/");
      }
    } catch {
      setError("Error de conexión con el servidor");
    }
    setLoading(false);
  };

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#111", fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "#1e1e1e", padding: 40, borderRadius: 16, width: "100%", maxWidth: 380,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)", color: "#fff"
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          AquaEquipos
        </h1>
        <p style={{ textAlign: "center", color: "#aaa", marginBottom: 28, fontSize: 14 }}>
          Gestión de productos
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#aaa", marginBottom: 4, display: "block" }}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #444",
                background: "#2a2a2a", color: "#fff", fontSize: 15, boxSizing: "border-box"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#aaa", marginBottom: 4, display: "block" }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #444",
                background: "#2a2a2a", color: "#fff", fontSize: 15, boxSizing: "border-box"
              }}
            />
          </div>
          {error && (
            <p style={{ color: "#f55", fontSize: 13, margin: 0, textAlign: "center" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px", borderRadius: 8, background: loading ? "#555" : "#0070f3",
              color: "#fff", border: "none", fontWeight: 700, fontSize: 16,
              cursor: loading ? "default" : "pointer", marginTop: 4
            }}
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
