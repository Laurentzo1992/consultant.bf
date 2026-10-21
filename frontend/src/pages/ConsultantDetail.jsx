import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getConsultant } from "../api/consultants";
import { getMyMissions } from "../api/missions";
import { createConnectionRequest } from "../api/connections";
import { apiErrorMessage } from "../api/payments";
import { useAuth } from "../context/AuthContext";
import ProfileView from "../components/ProfileView";
import { CheckIcon, FileIcon, LockIcon } from "../components/icons";
import usePrices from "../hooks/usePrices";
import { formatMoney } from "../constants";

const HOW_IT_WORKS = [
  "Vous envoyez votre demande avec un message",
  "Notre equipe la verifie (sous 24 h ouvrees)",
  "Vous recevez nom, telephone, email et CV",
];

function ContactForm({ profile }) {
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
    <form onSubmit={submit} className="pv-contact-form">
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
        Votre message
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Votre besoin, le calendrier et le contexte de la mission."
          maxLength={2000}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy} className="pv-cta">
        {busy ? "Envoi..." : "Demander la mise en relation"}
      </button>
      <p className="pv-price">Frais de mise en relation : {formatMoney(prices.connection_request, prices.currency)}</p>
    </form>
  );
}

function ContactPanel({ profile, user }) {
  const isOwn = user && user.id === profile.owner_id;

  let body;
  if (isOwn) {
    body = (
      <>
        <p className="pv-panel-text">Ceci est votre profil, tel que les cabinets le voient.</p>
        <Link to="/me/profile" className="btn pv-cta">
          Gerer mon profil
        </Link>
      </>
    );
  } else if (!user) {
    body = (
      <>
        <p className="pv-panel-text">Creez un compte cabinet / entreprise pour contacter ce consultant.</p>
        <Link to="/register?role=entreprise" className="btn pv-cta">
          Creer un compte cabinet
        </Link>
        <p className="pv-price">
          Deja inscrit ? <Link to="/login">Connectez-vous</Link>
        </p>
      </>
    );
  } else if (user.role === "entreprise") {
    body = <ContactForm profile={profile} />;
  } else {
    body = <p className="pv-panel-text">Seuls les cabinets et entreprises peuvent contacter un consultant.</p>;
  }

  return (
    <div className="pv-panel">
      <h2>{isOwn ? "Votre fiche publique" : "Contacter ce consultant"}</h2>
      {body}

      <ul className="pv-assurances">
        <li>
          <LockIcon size={16} />
          Identite et coordonnees protegees jusqu'a validation
        </li>
        <li>
          <FileIcon size={16} />
          {profile.has_cv ? "CV disponible apres mise en relation" : "Pas de CV depose pour l'instant"}
        </li>
      </ul>

      {!isOwn && (
        <ol className="pv-steps">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s}>
              <span>{i === HOW_IT_WORKS.length - 1 ? <CheckIcon size={14} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
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

  return (
    <ProfileView
      profile={profile}
      top={
        <Link to="/consultants" className="pv-back">
          ← Retour aux consultants
        </Link>
      }
      aside={<ContactPanel profile={profile} user={user} />}
    />
  );
}
