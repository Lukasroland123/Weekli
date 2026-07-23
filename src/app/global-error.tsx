"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="da">
      <body style={{ fontFamily: "Arial, Helvetica, sans-serif", margin: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "6rem 1.5rem",
            minHeight: "100vh",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Noget gik galt
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: 24, maxWidth: 320 }}>
            Der opstod en uventet fejl. Prøv at genindlæse siden.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#16a34a",
              color: "#fff",
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: 16,
              border: "none",
              cursor: "pointer",
            }}
          >
            Prøv igen
          </button>
        </div>
      </body>
    </html>
  );
}
