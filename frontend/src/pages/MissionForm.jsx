import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createMission, getMyMissions, updateMission } from "../api/missions";
import { apiErrorMessage } from "../api/payments";
import PaymentBox from "../components/PaymentBox";
import usePrices from "../hooks/usePrices";
import { DOMAINS, WORK_MODES, formatMoney } from "../constants";

const EMPTY = {
  title: "",
  description: "",
  domain: "finance",
  required_skills: "",
  min_experience: "",
  duration: "",
  max_daily_rate: "",
  work_mode: "hybride",
  city: "",
  start_date: "",
};

/** Create (/missions/new) or edit (/me/missions/:id/edit) a mission. */
export default function MissionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const prices = usePrices();
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMyMissions()
      .then((res) => {
        const m = res.data.find((x) => String(x.id) === id);
        if (!m) {
          setError("Mission introuvable");
          return;
        }
        setForm({
          ...EMPTY,
          ...m,
          required_skills: m.required_skills.join(", "),
          min_experience: String(m.min_experience ?? ""),
          max_daily_rate: m.max_daily_rate ? String(m.max_daily_rate) : "",
          duration: m.duration ?? "",
          city: m.city ?? "",
          start_date: m.start_date ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      min_experience: Number(form.min_experience || 0),
      max_daily_rate: form.max_daily_rate ? Number(form.max_daily_rate) : null,
      duration: form.duration || null,
      city: form.city || null,
      start_date: form.start_date || null,
    };
    try {
      if (id) {
        await updateMission(id, payload);
        navigate("/me/missions");
      } else {
        const res = await createMission(payload);
        setCreated(res.data);
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'enregistrer la mission"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="spinner" />;

  if (created) {
    return (
      <div className="card form-card fade-in-up">
        <div className="form-icon">✨</div>
        <h1>Plus qu'une etape !</h1>
        <p>
          Votre mission <strong>{created.title}</strong> est enregistree. Elle sera visible des consultants, et vous
          aurez acces aux profils recommandes, des que le paiement est confirme.
        </p>
        <PaymentBox
          type="mission_publication"
          referenceId={created.id}
          amount={prices.mission_publication}
          currency={prices.currency}
          onPaid={() => navigate(`/me/missions/${created.id}/matches`)}
        />
      </div>
    );
  }

  return (
    <div className="card form-card fade-in-up" style={{ maxWidth: 680 }}>
      <div className="form-icon">📋</div>
      <h1>{id ? "Modifier la mission" : "Publier une mission"}</h1>
      <p className="meta">
        Le nom de votre organisation reste masque : seuls le secteur et la taille sont affiches jusqu'a la mise en
        relation.
      </p>
      <form onSubmit={submit}>
        <label>
          Intitule de la mission
          <input value={form.title} onChange={update("title")} required minLength={3} placeholder="ex. Audit des comptes 2025" />
        </label>
        <div className="row">
          <label>
            Domaine
            <select value={form.domain} onChange={update("domain")}>
              {DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Experience minimale (ans)
            <input type="number" min={0} max={60} value={form.min_experience} onChange={update("min_experience")} />
          </label>
        </div>
        <label>
          Competences recherchees (separees par des virgules)
          <input
            value={form.required_skills}
            onChange={update("required_skills")}
            placeholder="ex. Audit financier, SYSCOHADA"
          />
        </label>
        <label>
          Description / termes de reference
          <textarea
            rows={7}
            value={form.description}
            onChange={update("description")}
            required
            minLength={20}
            placeholder="Contexte, objectifs, livrables attendus, calendrier..."
          />
        </label>
        <div className="row">
          <label>
            Duree
            <input value={form.duration} onChange={update("duration")} placeholder="ex. 3 mois" maxLength={100} />
          </label>
          <label>
            TJM maximum ({prices.currency} / jour)
            <input type="number" min={0} step={1000} value={form.max_daily_rate} onChange={update("max_daily_rate")} />
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
          Date de debut souhaitee
          <input type="date" value={form.start_date} onChange={update("start_date")} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy
            ? "Enregistrement..."
            : id
              ? "Enregistrer"
              : `Continuer vers le paiement (${formatMoney(prices.mission_publication, prices.currency)})`}
        </button>
      </form>
    </div>
  );
}
