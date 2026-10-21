import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "../context/AuthContext";
import { detectCountryFromIp } from "../api/geo";
import { apiErrorMessage } from "../api/payments";
import { COMPANY_SIZES } from "../constants";

const ROLES = [
  { value: "consultant", title: "Je suis consultant", text: "Je publie mon expertise et je postule aux missions." },
  { value: "entreprise", title: "Je recrute", text: "Entreprise, ONG ou institution : je publie des missions." },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [defaultCountry, setDefaultCountry] = useState("BF");
  const [form, setForm] = useState({
    role: searchParams.get("role") === "entreprise" ? "entreprise" : "consultant",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    whatsapp: false,
    city: "",
    company_name: "",
    company_sector: "",
    company_size: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    detectCountryFromIp().then(setDefaultCountry);
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const isCompany = form.role === "entreprise";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, company_size: form.company_size || null };
      await register(payload);
      navigate(isCompany ? "/missions/new" : "/me/profile");
    } catch (err) {
      setError(apiErrorMessage(err, "Inscription impossible"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card form-card fade-in-up">
      <div className="form-icon">🤝</div>
      <h1>Rejoindre Consultant.bf</h1>
      <p className="hint">
        🔒 Votre telephone et votre email restent prives. Ils ne sont communiques a l'autre partie qu'apres
        validation d'une mise en relation par notre equipe.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="role-switch" role="radiogroup" aria-label="Type de compte">
          {ROLES.map((r) => (
            <label key={r.value} className={`role-option ${form.role === r.value ? "selected" : ""}`}>
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={form.role === r.value}
                onChange={update("role")}
              />
              <strong>{r.title}</strong>
              <span>{r.text}</span>
            </label>
          ))}
        </div>

        {isCompany && (
          <>
            <label>
              Nom de l'organisation
              <input value={form.company_name} onChange={update("company_name")} required />
            </label>
            <div className="row">
              <label>
                Secteur d'activite
                <input value={form.company_sector} onChange={update("company_sector")} placeholder="ex. Agro-industrie" />
              </label>
              <label>
                Taille
                <select value={form.company_size} onChange={update("company_size")}>
                  <option value="">—</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <label>
          {isCompany ? "Nom de la personne a contacter" : "Nom complet"}
          <input value={form.full_name} onChange={update("full_name")} required minLength={2} />
        </label>
        <label>
          Email {isCompany ? "professionnel" : ""}
          <input type="email" value={form.email} onChange={update("email")} required />
        </label>
        <label>
          Telephone (prive)
          <PhoneInput
            international
            defaultCountry={defaultCountry}
            value={form.phone}
            onChange={(value) => setForm({ ...form, phone: value || "" })}
            placeholder="Votre numero"
            required
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })}
          />
          Ce numero est disponible sur WhatsApp
        </label>
        <div className="row">
          <label>
            Ville
            <input value={form.city} onChange={update("city")} placeholder="ex. Ouagadougou" />
          </label>
          <label>
            Mot de passe (8 caracteres min.)
            <input type="password" value={form.password} onChange={update("password")} required minLength={8} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Creation..." : "Creer mon compte"}
        </button>
      </form>
      <div className="signup-prompt">
        <p className="meta">Deja inscrit ?</p>
        <Link to="/login" className="btn btn-outline">
          Connectez-vous
        </Link>
      </div>
    </div>
  );
}
