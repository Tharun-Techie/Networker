"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setMsg("");
    try {
      if (mode === "login") {
        const u = await api.login({ email, password });
        setMsg(`Signed in as ${u.email} (${u.role}).`);
      } else {
        const u = await api.register({ email, password });
        setMsg(`Registered ${u.email} — now switch to Sign in.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <>
      <Nav />
      <main className="nw-main">
        <div className="card" style={{ maxWidth: 440 }}>
          <h2>{mode === "login" ? "Sign in" : "Register"}</h2>
          <label className="flabel">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%" }}
          />
          <div className="mt">
            <label className="flabel">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              style={{ width: "100%" }}
            />
          </div>
          <div className="row mt">
            <button className="btn-primary" onClick={submit}>
              {mode === "login" ? "Sign in" : "Register"}
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Need an account?" : "Have an account?"}
            </button>
          </div>
          {msg && <p className="mt">{msg}</p>}
        </div>
      </main>
    </>
  );
}
