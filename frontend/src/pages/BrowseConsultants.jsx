import { listConsultants } from "../api/consultants";
import { ProfileCard } from "../components/ListingCards";
import Pagination from "../components/Pagination";
import BrowseTabs from "../components/BrowseTabs";
import useBrowse from "../hooks/useBrowse";
import { DOMAINS } from "../constants";

const EMPTY_FILTERS = { q: "", domain: "", city: "", minExperience: "" };

export default function BrowseConsultants() {
  const { data, page, setPage, loading, error, input, setField, hasActiveFilters, clearFilters } = useBrowse(
    listConsultants,
    EMPTY_FILTERS
  );

  return (
    <div>
      <BrowseTabs />
      <h1>Trouver un consultant</h1>
      <p className="meta">
        Les profils sont anonymes : l'identite et les coordonnees ne sont partagees qu'apres une mise en relation
        validee.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Competence, expertise..."
          value={input.q}
          onChange={setField("q")}
          aria-label="Rechercher un consultant"
        />
        <select value={input.domain} onChange={setField("domain")} aria-label="Filtrer par domaine">
          <option value="">Tous les domaines</option>
          {DOMAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input type="text" placeholder="Ville" value={input.city} onChange={setField("city")} aria-label="Ville" />
        <select value={input.minExperience} onChange={setField("minExperience")} aria-label="Experience minimale">
          <option value="">Toute experience</option>
          <option value="3">3 ans et +</option>
          <option value="5">5 ans et +</option>
          <option value="10">10 ans et +</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="btn-outline" onClick={clearFilters}>
            Effacer
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton-card" key={i} />
          ))}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">🔍</div>
          <p>{hasActiveFilters ? "Aucun consultant ne correspond a ces criteres." : "Aucun profil publie pour l'instant."}</p>
          {hasActiveFilters && (
            <button type="button" className="btn" onClick={clearFilters}>
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="grid">
            {data.items.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
          <Pagination page={page} totalPages={data.total_pages} total={data.total} noun="consultant" onChange={setPage} />
        </>
      )}
    </div>
  );
}
