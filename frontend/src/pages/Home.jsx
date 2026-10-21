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
    title: "Publiez",
    text: "Le consultant publie son profil d'expertise, l'entreprise publie sa mission. Aucune coordonnee n'est visible.",
  },
  {
    title: "Matching",
    text: "Notre algorithme compare domaine, competences, experience, lieu et TJM, et classe les meilleurs profils.",
  },
  {
    title: "Demandez",
    text: "L'entreprise contacte un consultant, ou le consultant postule a une mission, avec un message.",
  },
  {
    title: "Validation",
    text: "Notre equipe verifie chaque demande. Une fois validee, les deux parties recoivent les coordonnees.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const prices = usePrices();
  const [consultants, setConsultants] = useState(null);
  const [missions, setMissions] = useState(null);

  useEffect(() => {
    listConsultants({ page: 1, pageSize: 3 })
      .then((res) => setConsultants(res.data))
      .catch(() => setConsultants({ items: [], total: 0 }));
    listMissions({ page: 1, pageSize: 3 })
      .then((res) => setMissions(res.data))
      .catch(() => setMissions({ items: [], total: 0 }));
  }, []);

  const consultantCta = user?.role === "consultant" ? "/me/profile" : "/register?role=consultant";
  const companyCta = user?.role === "entreprise" ? "/missions/new" : "/register?role=entreprise";

  return (
    <div>
      <section className="hero">
        <span className="hero-blob one" />
        <span className="hero-blob two" />
        <div className="hero-content fade-in-up">
          <span className="hero-eyebrow">Burkina Faso · Afrique de l'Ouest</span>
          <h1>
            Le bon <em>consultant</em> pour chaque mission.
          </h1>
          <p className="hero-sub">
            Consultant.bf met en relation consultants independants et entreprises, ONG et institutions.
            Matching par competences, coordonnees protegees jusqu'a validation par notre equipe.
          </p>
          <div className="hero-actions">
            {(!user || user.role === "entreprise") && (
              <Link to={companyCta} className="btn btn-cta">
                Publier une mission
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
            <span>🎯 Score de compatibilite</span>
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
        <h2>Dernieres missions</h2>
        <Link to="/missions">Toutes les missions{missions ? ` (${missions.total})` : ""} →</Link>
      </div>
      {missions?.items.length === 0 && <p className="meta">Aucune mission publiee pour l'instant.</p>}
      <div className="grid">
        {missions?.items.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </div>

      <div className="section-head">
        <h2>Consultants disponibles</h2>
        <Link to="/consultants">Tous les consultants{consultants ? ` (${consultants.total})` : ""} →</Link>
      </div>
      {consultants?.items.length === 0 && <p className="meta">Aucun profil publie pour l'instant.</p>}
      <div className="grid">
        {consultants?.items.map((p) => (
          <ProfileCard key={p.id} profile={p} />
        ))}
      </div>
    </div>
  );
}
