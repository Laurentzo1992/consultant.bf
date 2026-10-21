import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getConsultant } from "../api/consultants";
import { getMyMissions } from "../api/missions";
import { createConnectionRequest } from "../api/connections";
import { apiErrorMessage } from "../api/payments";
import { useAuth } from "../context/AuthContext";
import { SkillChips } from "../components/ListingCards";
import usePrices from "../hooks/usePrices";
import { AVAILABILITY_LABELS, DOMAIN_LABELS, WORK_MODE_LABELS, formatMoney } from "../constants";

function ContactConsultant({ profile }) {
  const navigate = useNavigate();
  const prices = usePrices();
  const [missions, setMissions] = useState([]);
  const [missionId, setMissionId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyMissions()
      .then((res) => setMissions(res.data.filter((m) => m.status === "published")))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createConnectionRequest({
        profileId: profile.id,
        missionId: missionId ? Number(missionId) : null,
        message,
      });
      navigate("/requests/sent");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'envoyer la demande"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="connect-box" onSubmit={submit}>
      <h2 style={{ fontSize: "1.1rem" }}>Contacter ce consultant</h2>
      {missions.length > 0 && (
        <label>
          A propos de la mission (facultatif)
          <select value={missionId} onChange={(e) => setMissionId(e.target.value)}>
            <option value="">Aucune mission en particulier</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Message
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Presentez brievement votre besoin, le calendrier et le contexte."
          maxLength={2000}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? "Envoi..." : `Demander la mise en relation (${formatMoney(prices.connection_request, prices.currency)})`}
      </button>
      <p className="hint" style={{ marginTop: "0.8rem" }}>
        Apres paiement, notre equipe valide la demande puis vous transmet le nom et les coordonnees du consultant.
      </p>
    </form>
  );
}

export default function ConsultantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getConsultant(id)
      .then((res) => setProfile(res.data))
      .catch(() => setError("Profil introuvable"));
  }, [id]);

  if (error) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">🔍</div>
        <p className="error">{error}</p>
        <Link to="/consultants" className="btn">
          Retour aux consultants
        </Link>
      </div>
    );
  }
  if (!profile) return <div className="spinner" />;

  const isOwn = user && user.id === profile.owner_id;

  return (
    <div className="card detail-card fade-in-up">
      <Link to="/consultants" className="meta" style={{ textDecoration: "none" }}>
        ← Retour aux consultants
      </Link>
      <span className="domain-tag" style={{ display: "block", marginTop: "1rem" }}>
        {DOMAIN_LABELS[profile.domain]}
      </span>
      <h1>{profile.headline}</h1>
      <SkillChips items={profile.skills} max={30} />

      <dl className="detail-grid">
        <div>
          <dt>Experience</dt>
          <dd>{profile.years_experience} ans</dd>
        </div>
        <div>
          <dt>TJM</dt>
          <dd>{profile.daily_rate ? `${formatMoney(profile.daily_rate)} / jour` : "A discuter"}</dd>
        </div>
        <div>
          <dt>Disponibilite</dt>
          <dd>{AVAILABILITY_LABELS[profile.availability]}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>
            {WORK_MODE_LABELS[profile.work_mode]}
            {profile.city ? ` · ${profile.city}` : ""}
          </dd>
        </div>
        {profile.languages && (
          <div>
            <dt>Langues</dt>
            <dd>{profile.languages}</dd>
          </div>
        )}
      </dl>

      <p style={{ whiteSpace: "pre-line" }}>{profile.bio}</p>

      {profile.experiences.length > 0 && (
        <section className="profile-section">
          <h2>Experiences</h2>
          <ul className="timeline">
            {profile.experiences.map((e, i) => (
              <li key={i}>
                <strong>{e.title}</strong>
                {e.organization ? ` · ${e.organization}` : ""}
                <span className="meta"> — {e.start_year} - {e.end_year ?? "aujourd'hui"}</span>
                {e.description && <p style={{ whiteSpace: "pre-line" }}>{e.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.diplomas.length > 0 && (
        <section className="profile-section">
          <h2>Formation</h2>
          <ul className="timeline">
            {profile.diplomas.map((d, i) => (
              <li key={i}>
                <strong>{d.title}</strong>
                {d.institution ? ` · ${d.institution}` : ""}
                {d.year && <span className="meta"> — {d.year}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.certifications.length > 0 && (
        <section className="profile-section">
          <h2>Certifications</h2>
          <div className="chips">
            {profile.certifications.map((c, i) => (
              <span key={i} className="chip">
                {c.name}
                {c.issuer ? ` (${c.issuer})` : ""}
                {c.year ? ` · ${c.year}` : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      {profile.has_cv && (
        <p className="cv-note" style={{ marginTop: "1rem" }}>
          📄 CV disponible — transmis apres validation de la mise en relation
        </p>
      )}

      {isOwn && (
        <p className="hint">
          Ceci est votre profil. <Link to="/me/profile">Le modifier</Link>
        </p>
      )}
      {!user && (
        <p className="hint">
          <Link to="/login">Connectez-vous</Link> ou <Link to="/register?role=entreprise">creez un compte cabinet / entreprise</Link>{" "}
          pour contacter ce consultant.
        </p>
      )}
      {user?.role === "entreprise" && <ContactConsultant profile={profile} />}
      {user?.role === "consultant" && !isOwn && (
        <p className="hint">Seuls les cabinets et entreprises peuvent contacter un consultant.</p>
      )}
    </div>
  );
}
