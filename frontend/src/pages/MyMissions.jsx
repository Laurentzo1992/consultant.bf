import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteMission, getMyMissions, setMissionVisibility } from "../api/missions";
import PaymentBox from "../components/PaymentBox";
import usePrices from "../hooks/usePrices";
import { DOMAIN_LABELS, LISTING_STATUS_LABELS } from "../constants";

export default function MyMissions() {
  const prices = usePrices();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMyMissions()
      .then((res) => setMissions(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (m) => {
    await setMissionVisibility(m.id, m.status !== "published");
    load();
  };

  const remove = async (m) => {
    if (!window.confirm(`Supprimer definitivement la mission « ${m.title} » ?`)) return;
    await deleteMission(m.id);
    load();
  };

  return (
    <div>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>Mes missions</h1>
        <Link to="/missions/new" className="btn btn-cta">
          Publier une mission
        </Link>
      </div>
      {loading && <div className="spinner" />}
      {!loading && missions.length === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">📋</div>
          <p>Vous n'avez pas encore publie de mission.</p>
          <Link to="/missions/new" className="btn">
            Publier ma premiere mission
          </Link>
        </div>
      )}
      <div className="grid">
        {missions.map((m, i) => (
          <div className="card fade-in-up" key={m.id} style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="domain-tag">{DOMAIN_LABELS[m.domain]}</span>
            <h2 style={{ fontSize: "1.1rem" }}>{m.title}</h2>
            <span className={`status-pill ${m.status}`}>{LISTING_STATUS_LABELS[m.status] || m.status}</span>
            {m.status === "pending_payment" && (
              <PaymentBox
                type="mission_publication"
                referenceId={m.id}
                amount={prices.mission_publication}
                currency={prices.currency}
                onPaid={load}
              />
            )}
            <div className="card-actions">
              {m.status === "published" && (
                <Link to={`/me/missions/${m.id}/matches`} className="btn btn-sm">
                  Consultants recommandes
                </Link>
              )}
              <Link to={`/me/missions/${m.id}/edit`} className="btn btn-sm btn-outline">
                Modifier
              </Link>
            </div>
            <div className="card-actions">
              {(m.status === "published" || m.status === "archived") && (
                <button className="link-btn" onClick={() => toggle(m)}>
                  {m.status === "published" ? "Cloturer (masquer)" : "Rouvrir"}
                </button>
              )}
              <button className="link-btn" style={{ color: "var(--red-600)" }} onClick={() => remove(m)}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
