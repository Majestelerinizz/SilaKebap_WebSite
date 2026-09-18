export default function ProductLoading() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.25rem" }}>
      <div className="skeleton" style={{ height: 28, width: 120, marginBottom: 16 }} />
      <div className="skeleton" style={{ aspectRatio: "16/10", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 32, width: "70%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 16, width: "90%", marginBottom: 18 }} />
      <div className="skeleton" style={{ height: 56, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 56, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 48, borderRadius: 999 }} />
    </main>
  );
}
