import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listConsultants } from "../api/consultants";
import { listMissions } from "../api/missions";
import { useAuth } from "../context/AuthContext";
import MatchScene from "../components/MatchScene";
import { MissionCard, ProfileCard } from "../components/ListingCards";
import usePrices from "../hooks/usePrices";
import { formatMoney } from "../constants";

const STEPS = [
  {
    title: "Le consultant s'inscrit",
    text: "Il cree son profil complet : expertise, competences, experiences, diplomes, certifications et CV.",
  },
  {
    title: "Le cabinet recherche",
    text: "Cabinets et entreprises filtrent les profils par competence, domaine, ville et experience. Les profils sont anonymes.",
  },
  {
    title: "Il demande le contact",
    text: "Le profil correspond ? Le cabinet demande la mise en relation avec un message expliquant son besoin.",
  },
  {
    title: "Validation et echange",
    text: "Notre equipe verifie la demande, puis transmet a chacun les coordonnees de l'autre, et le CV au cabinet.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const prices = usePrices();
  const [consultants, setConsultants] = useState(null);
  const [missions, setMissions] = useState(null);

  useEffect(() => {
    listConsultants({ page: 1, pageSize: 6 })
      .then((res) => setConsultants(res.data))
      .catch(() => setConsultants({ items: [], total: 0 }));
    listMissions({ page: 1, pageSize: 3 })
      .then((res) => setMissions(res.data))
      .catch(() => setMissions({ items: [], total: 0 }));
  }, []);

  const consultantCta = user?.role === "consultant" ? "/me/profile" : "/register?role=consultant";

  return (
    <div>
      <section className="hero">
        <span className="hero-blob one" />
        <span className="hero-blob two" />
        <div className="hero-content fade-in-up">
          <span className="hero-eyebrow">Burkina Faso · Afrique de l'Ouest</span>
          <h1>
            Trouvez le <em>consultant</em> qu'il vous faut.
          </h1>
          <p className="hero-sub">
            Les consultants publient un profil complet, les cabinets et entreprises les recherchent et choisissent
            avec qui entrer en contact. Coordonnees et CV proteges jusqu'a validation par notre equipe.
          </p>
          <div className="hero-actions">
            {(!user || user.role === "entreprise") && (
              <Link to="/consultants" className="btn btn-cta">
                Trouver un consultant
              </Link>
            )}
            {(!user || user.role === "consultant") && (
              <Link to={consultantCta} className={`btn ${user ? "btn-cta" : "btn-outline"}`}>
                Je suis consultant
              </Link>
            )}
          </div>
          <div className="hero-badges">
            <span>🔒 Coordonnees protegees</span>
            <span>📄 Profils complets et CV</span>
            <span>✅ Mises en relation verifiees</span>
          </div>
        </div>
        <div className="match-scene-wrap">
          <MatchScene />
        </div>
      </section>

      <h2>Comment ca marche</h2>
      <div className="steps">
        {STEPS.map((s, i) => (
          <div className="step fade-in-up" key={s.title} style={{ animationDelay: `${i * 0.06}s` }}>
            <span className="step-num">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
      <p className="hint">
        Tarifs : profil consultant {formatMoney(prices.profile_publication, prices.currency)} · mission{" "}
        {formatMoney(prices.mission_publication, prices.currency)} · mise en relation{" "}
        {formatMoney(prices.connection_request, prices.currency)} — payables par Mobile Money.
      </p>

      <div className="section-head">
        <h2>Consultants a decouvrir</h2>
        <Link to="/consultants">Tous les consultants{consultants ? ` (${consultants.total})` : ""} →</Link>
      </div>
      {consultants?.items.length === 0 && <p className="meta">Aucun profil publie pour l'instant.</p>}
      <div className="grid">
        {consultants?.items.map((p) => (
          <ProfileCard key={p.id} profile={p} />
        ))}
      </div>
      <div className="section-head">
        <h2>Missions publiees</h2>
        <Link to="/missions">Toutes les missions{missions ? ` (${missions.total})` : ""} →</Link>
      </div>
      {missions?.items.length === 0 && <p className="meta">Aucune mission publiee pour l'instant.</p>}
      <div className="grid">
        {missions?.items.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </div>

    </div>
  );
}
