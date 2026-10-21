function buildPageList(current, totalPages) {
  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
}

export default function Pagination({ page, totalPages, total, noun, onChange }) {
  if (totalPages <= 1) return null;
  const pageList = buildPageList(page, totalPages);
  return (
    <>
      <nav className="pagination" aria-label="Pagination">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page precedente">
          ←
        </button>
        {pageList.map((p, i) => (
          <span key={p} style={{ display: "contents" }}>
            {i > 0 && p - pageList[i - 1] > 1 && <span className="meta">…</span>}
            <button className={p === page ? "active" : ""} onClick={() => onChange(p)}>
              {p}
            </button>
          </span>
        ))}
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Page suivante">
          →
        </button>
      </nav>
      <p className="pagination-info">
        Page {page} sur {totalPages} · {total} {noun}
        {total > 1 ? "s" : ""} au total
      </p>
    </>
  );
}
