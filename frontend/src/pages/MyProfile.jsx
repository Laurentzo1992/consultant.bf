import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyMatchingMissions, getMyProfile, saveMyProfile, setMyProfileVisibility } from "../api/consultants";
import { apiErrorMessage } from "../api/payments";
import PaymentBox from "../components/PaymentBox";
import { MissionCard } from "../components/ListingCards";
import usePrices from "../hooks/usePrices";
import { AVAILABILITIES, DOMAINS, LISTING_STATUS_LABELS, WORK_MODES, formatMoney } from "../constants";

const EMPTY = {
  headline: "",
  bio: "",
  domain: "finance",
  skills: "",
  years_experience: "",
  daily_rate: "",
  availability: "immediate",
  work_mode: "hybride",
  languages: "",
  city: "",
};

function toForm(profile) {
  return {
    ...EMPTY,
    ...profile,
    skills: profile.skills.join(", "),
    years_experience: String(profile.years_experience ?? ""),
    daily_rate: profile.daily_rate ? String(profile.daily_rate) : "",
    languages: profile.languages ?? "",
    city: profile.city ?? "",
  };
}

export default function MyProfile() {
  const prices = usePrices();
  const [profile, setProfile] = useState(undefined);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    getMyProfile()
      .then((res) => {
        setProfile(res.data);
        setForm(toForm(res.data));
        getMyMatchingMissions().then((m) => setMatches(m.data)).catch(() => setMatches([]));
      })
      .catch(() => {
        setProfile(null);
        setEditing(true);
      });

  useEffect(() => {
    load();
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await saveMyProfile({
        ...form,
        years_experience: Number(form.years_experience || 0),
        daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
        languages: form.languages || null,
        city: form.city || null,
      });
      setProfile(res.data);
      setForm(toForm(res.data));
      setEditing(false);
      setSaved(true);
      getMyMatchingMissions().then((m) => setMatches(m.data)).catch(() => {});
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'enregistrer le profil"));
    } finally {
      setBusy(false);
    }
  };

  const toggleVisibility = async () => {
    const res = await setMyProfileVisibility(profile.status !== "published");
    setProfile(res.data);
  };

  if (profile === undefined) return <div className="spinner" />;

  return (
    <div>
      <h1>Mon profil consultant</h1>

      {profile && !editing && (
        <div className="card fade-in-up">
          <span className={`status-pill ${profile.status}`}>{LISTING_STATUS_LABELS[profile.status]}</span>
          <h2 style={{ marginTop: "0.8rem" }}>{profile.headline}</h2>
          <p className="meta">
            {profile.years_experience} ans · {profile.daily_rate ? `${formatMoney(profile.daily_rate)} / jour` : "TJM a discuter"}
            {profile.city ? ` · ${profile.city}` : ""}
          </p>
          {saved && <p className="hint">✓ Profil enregistre.</p>}

          {profile.status === "pending_payment" && (
            <>
              <p>
                Derniere etape : publiez votre profil pour apparaitre dans les recherches et les recommandations des
                entreprises.
              </p>
              <PaymentBox
                type="profile_publication"
                referenceId={profile.id}
                amount={prices.profile_publication}
                currency={prices.currency}
                onPaid={load}
              />
            </>
          )}

          <div className="card-actions">
            <button className="btn-outline" onClick={() => setEditing(true)}>
              Modifier mon profil
            </button>
            {profile.status === "published" && <Link to={`/consultants/${profile.id}`}>Voir ma fiche publique →</Link>}
            {(profile.status === "published" || profile.status === "archived") && (
              <button className="link-btn" onClick={toggleVisibility}>
                {profile.status === "published" ? "Masquer mon profil" : "Rendre mon profil visible"}
              </button>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="card form-card fade-in-up" style={{ maxWidth: 680 }}>
          <div className="form-icon">🧭</div>
          <h2>{profile ? "Modifier mon profil" : "Creer mon profil"}</h2>
          <p className="meta">
            Votre nom n'apparait jamais publiquement : votre expertise parle pour vous. Plus vos competences sont
            precises, meilleur est le matching.
          </p>
          <form onSubmit={submit}>
            <label>
              Titre professionnel
              <input
                value={form.headline}
                onChange={update("headline")}
                required
                minLength={3}
                placeholder="ex. Expert-comptable, audit et controle de gestion"
              />
            </label>
            <div className="row">
              <label>
                Domaine principal
                <select value={form.domain} onChange={update("domain")}>
                  {DOMAINS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Annees d'experience
                <input type="number" min={0} max={60} value={form.years_experience} onChange={update("years_experience")} required />
              </label>
            </div>
            <label>
              Competences (separees par des virgules)
              <input value={form.skills} onChange={update("skills")} placeholder="ex. Audit financier, SYSCOHADA, Excel" />
            </label>
            <label>
              Presentation
              <textarea
                rows={6}
                value={form.bio}
                onChange={update("bio")}
                required
                minLength={20}
                placeholder="Parcours, references (sans nommer vos clients si confidentiel), types de missions..."
              />
            </label>
            <div className="row">
              <label>
                TJM ({prices.currency} / jour)
                <input type="number" min={0} step={1000} value={form.daily_rate} onChange={update("daily_rate")} />
              </label>
              <label>
                Disponibilite
                <select value={form.availability} onChange={update("availability")}>
                  {AVAILABILITIES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row">
              <label>
                Mode de travail
                <select value={form.work_mode} onChange={update("work_mode")}>
                  {WORK_MODES.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ville
                <input value={form.city} onChange={update("city")} placeholder="ex. Ouagadougou" />
              </label>
            </div>
            <label>
              Langues
              <input value={form.languages} onChange={update("languages")} placeholder="ex. Francais, Anglais, Moore" />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="card-actions">
              <button type="submit" disabled={busy}>
                {busy
                  ? "Enregistrement..."
                  : profile
                    ? "Enregistrer"
                    : `Continuer vers la publication (${formatMoney(prices.profile_publication, prices.currency)})`}
              </button>
              {profile && (
                <button type="button" className="btn-outline" onClick={() => setEditing(false)}>
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {profile && (
        <>
          <div className="section-head">
            <h2>Missions recommandees pour vous</h2>
            <Link to="/missions">Toutes les missions →</Link>
          </div>
          {matches === null && <div className="spinner" />}
          {matches?.length === 0 && (
            <p className="meta">
              Aucune mission compatible pour le moment. Ajoutez des competences precises a votre profil pour elargir
              les recommandations.
            </p>
          )}
          <div className="grid">
            {matches?.map((m) => (
              <MissionCard key={m.id} mission={m} highlightSkills={profile.skills} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
