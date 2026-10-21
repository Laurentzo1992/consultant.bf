import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMissionMatches, getMyMissions } from "../api/missions";
import { ProfileCard } from "../components/ListingCards";

export default function MissionMatches() {
  const { id } = useParams();
  const [mission, setMission] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyMissions().then((res) => setMission(res.data.find((m) => String(m.id) === id) ?? null));
    getMissionMatches(id)
      .then((res) => setMatches(res.data))
      .catch(() => setError("Mission introuvable"));
  }, [id]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <Link to="/me/missions" className="meta" style={{ textDecoration: "none" }}>
        ← Mes missions
      </Link>
      <h1 style={{ marginTop: "0.8rem" }}>Consultants recommandes</h1>
      {mission && (
        <p className="meta">
          Pour « {mission.title} » — classes par score de compatibilite (domaine, competences, experience, lieu et
          TJM). Les competences en vert correspondent a votre besoin.
        </p>
      )}
      {matches === null && <div className="spinner" />}
      {matches?.length === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">🧭</div>
          <p>Aucun consultant suffisamment compatible pour le moment. Elargissez les competences demandees, ou parcourez tous les profils.</p>
          <Link to="/consultants" className="btn">
            Parcourir les consultants
          </Link>
        </div>
      )}
      <div className="grid">
        {matches?.map((p) => (
          <ProfileCard key={p.id} profile={p} highlightSkills={mission?.required_skills} />
        ))}
      </div>
    </div>
  );
}
