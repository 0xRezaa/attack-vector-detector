"use client";
const ADMIN_TOKEN = "sk-admin-super-secret-token-abc123";
export default function Home() {
  return (
    <main>
      <h1>Demo Notes App</h1>
      <p>Shipped fast with Cursor.</p>
      {/* VULN: admin token exposed to client bundle */}
      <script dangerouslySetInnerHTML={{ __html: `window.__ADMIN_TOKEN="${ADMIN_TOKEN}"` }} />
    </main>
  );
}
