import { listMissions } from "../api/missions";
import { MissionCard } from "../components/ListingCards";
import Pagination from "../components/Pagination";
import BrowseTabs from "../components/BrowseTabs";
import useBrowse from "../hooks/useBrowse";
import { DOMAINS, WORK_MODES } from "../constants";

const EMPTY_FILTERS = { q: "", domain: "", city: "", workMode: "" };

export default function BrowseMissions() {
  const { data, page, setPage, loading, error, input, setField, hasActiveFilters, clearFilters } = useBrowse(
    listMissions,
    EMPTY_FILTERS
  );

  return (
    <div>
      <BrowseTabs />
      <h1>Missions ouvertes</h1>
      <p className="meta">
        Entreprises, ONG et institutions publient ici leurs besoins. Le nom de l'organisation est revele apres
        validation de la mise en relation.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Mot-cle, competence..."
          value={input.q}
          onChange={setField("q")}
          aria-label="Rechercher une mission"
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
        <select value={input.workMode} onChange={setField("workMode")} aria-label="Mode de travail">
          <option value="">Tous modes</option>
          {WORK_MODES.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
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
          <p>{hasActiveFilters ? "Aucune mission ne correspond a ces criteres." : "Aucune mission publiee pour l'instant."}</p>
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
            {data.items.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
          <Pagination page={page} totalPages={data.total_pages} total={data.total} noun="mission" onChange={setPage} />
        </>
      )}
    </div>
  );
}
