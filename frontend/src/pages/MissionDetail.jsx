import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMission } from "../api/missions";
import { getMyProfile } from "../api/consultants";
import { createConnectionRequest } from "../api/connections";
import { apiErrorMessage } from "../api/payments";
import { useAuth } from "../context/AuthContext";
import { SkillChips } from "../components/ListingCards";
import usePrices from "../hooks/usePrices";
import { COMPANY_SIZE_LABELS, DOMAIN_LABELS, WORK_MODE_LABELS, formatMoney } from "../constants";

function ApplyToMission({ mission }) {
  const navigate = useNavigate();
  const prices = usePrices();
  const [profile, setProfile] = useState(undefined);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProfile()
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, []);

  if (profile === undefined) return <div className="spinner" />;
  if (!profile || profile.status !== "published") {
    return (
      <div className="connect-box">
        <p>Pour postuler, votre profil consultant doit d'abord etre publie.</p>
        <Link to="/me/profile" className="btn">
          {profile ? "Finaliser mon profil" : "Creer mon profil"}
        </Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createConnectionRequest({ missionId: mission.id, message });
      navigate("/requests/sent");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'envoyer la candidature"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="connect-box" onSubmit={submit}>
      <h2 style={{ fontSize: "1.1rem" }}>Postuler a cette mission</h2>
      <p className="meta">Votre profil « {profile.headline} » sera transmis a l'organisation.</p>
      <label>
        Message de motivation
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Expliquez en quelques lignes pourquoi vous etes la bonne personne pour cette mission."
          maxLength={2000}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? "Envoi..." : `Postuler (${formatMoney(prices.connection_request, prices.currency)})`}
      </button>
    </form>
  );
}

export default function MissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [mission, setMission] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMission(id)
      .then((res) => setMission(res.data))
      .catch(() => setError("Mission introuvable"));
  }, [id]);

  if (error) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">🔍</div>
        <p className="error">{error}</p>
        <Link to="/missions" className="btn">
          Retour aux missions
        </Link>
      </div>
    );
  }
  if (!mission) return <div className="spinner" />;

  const isOwn = user && user.id === mission.company.id;

  return (
    <div className="card detail-card fade-in-up">
      <Link to="/missions" className="meta" style={{ textDecoration: "none" }}>
        ← Retour aux missions
      </Link>
      <span className="domain-tag" style={{ display: "block", marginTop: "1rem" }}>
        {DOMAIN_LABELS[mission.domain]}
      </span>
      <h1>{mission.title}</h1>
      <p className="meta">
        {mission.company.sector || "Organisation"}
        {mission.company.size ? ` · ${COMPANY_SIZE_LABELS[mission.company.size]}` : ""}
        {" · publiee le "}
        {new Date(mission.created_at).toLocaleDateString("fr-FR")}
      </p>
      <SkillChips items={mission.required_skills} max={30} />

      <dl className="detail-grid">
        <div>
          <dt>Lieu</dt>
          <dd>
            {WORK_MODE_LABELS[mission.work_mode]}
            {mission.city ? ` · ${mission.city}` : ""}
          </dd>
        </div>
        {mission.duration && (
          <div>
            <dt>Duree</dt>
            <dd>{mission.duration}</dd>
          </div>
        )}
        <div>
          <dt>TJM max</dt>
          <dd>{mission.max_daily_rate ? `${formatMoney(mission.max_daily_rate)} / jour` : "A discuter"}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>{mission.min_experience ? `${mission.min_experience} ans min.` : "Ouverte"}</dd>
        </div>
        {mission.start_date && (
          <div>
            <dt>Debut</dt>
            <dd>{new Date(mission.start_date).toLocaleDateString("fr-FR")}</dd>
          </div>
        )}
      </dl>

      <p style={{ whiteSpace: "pre-line" }}>{mission.description}</p>

      {isOwn && (
        <div className="card-actions">
          <Link to={`/me/missions/${mission.id}/matches`} className="btn">
            Voir les consultants recommandes
          </Link>
          <Link to={`/me/missions/${mission.id}/edit`} className="btn btn-outline">
            Modifier
          </Link>
        </div>
      )}
      {!user && (
        <p className="hint">
          <Link to="/login">Connectez-vous</Link> ou{" "}
          <Link to="/register?role=consultant">creez un compte consultant</Link> pour postuler.
        </p>
      )}
      {user?.role === "consultant" && <ApplyToMission mission={mission} />}
      {user?.role === "entreprise" && !isOwn && (
        <p className="hint">Seuls les consultants peuvent postuler aux missions.</p>
      )}
    </div>
  );
}
