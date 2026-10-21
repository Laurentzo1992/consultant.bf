import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteMyCv,
  downloadMyCv,
  getMyMatchingMissions,
  getMyProfile,
  saveMyProfile,
  setMyProfileVisibility,
  uploadMyCv,
} from "../api/consultants";
import { openBlob } from "../api/connections";
import { apiErrorMessage } from "../api/payments";
import PaymentBox from "../components/PaymentBox";
import ListEditor, { cleanItems } from "../components/ListEditor";
import ProfileView from "../components/ProfileView";
import { FileIcon } from "../components/icons";
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
  experiences: [],
  diplomas: [],
  certifications: [],
};

const EXPERIENCE_FIELDS = [
  { name: "title", label: "Poste / role", required: true, placeholder: "ex. Auditeur senior" },
  { name: "organization", label: "Organisation (facultatif)", placeholder: "Laissez vide si confidentiel" },
  { name: "start_year", label: "Debut (annee)", type: "number", required: true },
  { name: "end_year", label: "Fin (vide = en cours)", type: "number" },
  { name: "description", label: "Realisations", type: "textarea", wide: true, placeholder: "Missions, resultats..." },
];
const DIPLOMA_FIELDS = [
  { name: "title", label: "Diplome", required: true, placeholder: "ex. Master en audit" },
  { name: "institution", label: "Etablissement" },
  { name: "year", label: "Annee", type: "number" },
];
const CERTIFICATION_FIELDS = [
  { name: "name", label: "Certification", required: true, placeholder: "ex. PMP, CISA, ACCA" },
  { name: "issuer", label: "Organisme" },
  { name: "year", label: "Annee", type: "number" },
];

/** What makes a profile "complete", shown as a checklist to the consultant. */
function completeness(profile) {
  const checks = [
    ["Titre et presentation detaillee", profile.headline && profile.bio.length >= 100],
    ["Au moins 3 competences", profile.skills.length >= 3],
    ["Au moins une experience", profile.experiences.length > 0],
    ["Un diplome", profile.diplomas.length > 0],
    ["TJM indique", Boolean(profile.daily_rate)],
    ["Langues", Boolean(profile.languages)],
    ["CV en PDF", profile.has_cv],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([l]) => l) };
}

function toForm(profile) {
  const str = (v) => (v == null ? "" : String(v));
  return {
    ...EMPTY,
    headline: profile.headline,
    bio: profile.bio,
    domain: profile.domain,
    skills: profile.skills.join(", "),
    years_experience: str(profile.years_experience),
    daily_rate: profile.daily_rate ? String(profile.daily_rate) : "",
    availability: profile.availability,
    work_mode: profile.work_mode,
    languages: profile.languages ?? "",
    city: profile.city ?? "",
    experiences: profile.experiences.map((e) => ({
      ...e,
      organization: e.organization ?? "",
      description: e.description ?? "",
      start_year: str(e.start_year),
      end_year: str(e.end_year),
    })),
    diplomas: profile.diplomas.map((d) => ({ ...d, institution: d.institution ?? "", year: str(d.year) })),
    certifications: profile.certifications.map((c) => ({ ...c, issuer: c.issuer ?? "", year: str(c.year) })),
  };
}

function CvSection({ profile, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Le CV ne doit pas depasser 5 Mo");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await uploadMyCv(file);
      onChange(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'envoyer le CV"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Supprimer votre CV ?")) return;
    const res = await deleteMyCv();
    onChange(res.data);
  };

  const view = async () => openBlob((await downloadMyCv()).data);

  return (
    <div className="pv-panel">
      <h2>Mon CV</h2>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={upload} />
      <div className="pv-cv-row">
        <FileIcon size={26} />
        <div>
          <strong>{profile.has_cv ? "CV depose (PDF)" : "Aucun CV depose"}</strong>
          Prive : transmis au cabinet seulement apres validation d'une mise en relation.
        </div>
      </div>
      {profile.has_cv ? (
        <div className="pv-cv-actions">
          <button type="button" className="link-btn" onClick={view}>
            Voir
          </button>
          <button type="button" className="link-btn" disabled={busy} onClick={() => input.current.click()}>
            {busy ? "Envoi..." : "Remplacer"}
          </button>
          <button type="button" className="link-btn" style={{ color: "var(--red-600)" }} onClick={remove}>
            Supprimer
          </button>
        </div>
      ) : (
        <button type="button" className="pv-cta" disabled={busy} onClick={() => input.current.click()}>
          {busy ? "Envoi..." : "Deposer mon CV (PDF, 5 Mo max.)"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
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

  const loadMatches = () =>
    getMyMatchingMissions()
      .then((m) => setMatches(m.data))
      .catch(() => setMatches([]));

  const load = () =>
    getMyProfile()
      .then((res) => {
        setProfile(res.data);
        setForm(toForm(res.data));
        loadMatches();
      })
      .catch(() => {
        setProfile(null);
        setEditing(true);
      });

  useEffect(() => {
    load();
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setList = (field) => (items) => setForm({ ...form, [field]: items });

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
        experiences: cleanItems(form.experiences, { required: "title", years: ["start_year", "end_year"] }),
        diplomas: cleanItems(form.diplomas, { required: "title", years: ["year"] }),
        certifications: cleanItems(form.certifications, { required: "name", years: ["year"] }),
      });
      setProfile(res.data);
      setForm(toForm(res.data));
      setEditing(false);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      loadMatches();
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

  const progress = profile ? completeness(profile) : null;

  return (
    <div>
      {!(profile && !editing) && <h1>Mon profil consultant</h1>}

      {profile && !editing && (
        <ProfileView
          profile={profile}
          top={saved && <p className="hint">✓ Profil enregistre. Voici votre fiche telle que les cabinets la voient.</p>}
          aside={
            <>
              <div className="pv-panel">
                <div className="pv-owner-status">
                  <h2>Mon profil</h2>
                  <span className={`status-pill ${profile.status}`}>{LISTING_STATUS_LABELS[profile.status]}</span>
                </div>

                <div className="completeness">
                  <div className="completeness-head">
                    <strong>Complete a {progress.percent}%</strong>
                  </div>
                  <div
                    className="completeness-bar"
                    role="progressbar"
                    aria-valuenow={progress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progress.percent}%` }} />
                  </div>
                  {progress.missing.length > 0 ? (
                    <ul className="pv-missing">
                      {progress.missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="meta">Profil complet : il est mieux classe dans les recherches des cabinets.</span>
                  )}
                </div>

                {profile.status === "pending_payment" && (
                  <>
                    <p className="pv-panel-text">
                      Derniere etape : publiez votre profil pour apparaitre dans les recherches des cabinets.
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

                <div className="pv-owner-actions">
                  <button className="pv-cta" onClick={() => setEditing(true)}>
                    Modifier mon profil
                  </button>
                  {profile.status === "published" && (
                    <Link to={`/consultants/${profile.id}`} className="btn btn-outline">
                      Voir ma fiche publique
                    </Link>
                  )}
                  {(profile.status === "published" || profile.status === "archived") && (
                    <button className="link-btn" onClick={toggleVisibility}>
                      {profile.status === "published" ? "Masquer mon profil" : "Rendre mon profil visible"}
                    </button>
                  )}
                </div>
              </div>
              <CvSection profile={profile} onChange={setProfile} />
            </>
          }
        />
      )}

      {editing && (
        <div className="card form-card fade-in-up" style={{ maxWidth: 760 }}>
          <div className="form-icon">🧭</div>
          <h2>{profile ? "Modifier mon profil" : "Creer mon profil"}</h2>
          <p className="meta">
            Votre nom n'apparait jamais publiquement : votre expertise parle pour vous. Plus votre profil est complet et
            precis, plus les cabinets vous trouvent.
          </p>
          <form onSubmit={submit}>
            <h3 className="form-section">Expertise</h3>
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
                placeholder="Parcours, secteurs d'intervention, types de missions, valeur ajoutee..."
              />
            </label>

            <h3 className="form-section">Experiences professionnelles</h3>
            <ListEditor
              items={form.experiences}
              onChange={setList("experiences")}
              fields={EXPERIENCE_FIELDS}
              blank={{ title: "", organization: "", start_year: "", end_year: "", description: "" }}
              addLabel="Ajouter une experience"
              emptyHint="Ajoutez vos principales experiences, de la plus recente a la plus ancienne."
            />

            <h3 className="form-section">Formation</h3>
            <ListEditor
              items={form.diplomas}
              onChange={setList("diplomas")}
              fields={DIPLOMA_FIELDS}
              blank={{ title: "", institution: "", year: "" }}
              addLabel="Ajouter un diplome"
            />

            <h3 className="form-section">Certifications</h3>
            <ListEditor
              items={form.certifications}
              onChange={setList("certifications")}
              fields={CERTIFICATION_FIELDS}
              blank={{ name: "", issuer: "", year: "" }}
              addLabel="Ajouter une certification"
            />

            <h3 className="form-section">Conditions</h3>
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
            {!profile && <p className="hint">Vous pourrez deposer votre CV (PDF) juste apres avoir enregistre votre profil.</p>}
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
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setForm(toForm(profile));
                    setEditing(false);
                  }}
                >
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
              Aucune mission compatible pour le moment. Les cabinets peuvent aussi vous trouver directement via la
              recherche de profils.
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
