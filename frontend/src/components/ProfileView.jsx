import { AVAILABILITY_LABELS, DOMAIN_LABELS, WORK_MODE_LABELS, formatMoney } from "../constants";
import { AwardIcon, BriefcaseIcon, CheckIcon, GraduationIcon, LanguageIcon, PinIcon, UserIcon } from "./icons";

/**
 * A consultant profile laid out like a CV: header with key facts, then the
 * career (about, skills, experiences, education, certifications) in the main
 * column and `aside` (contact panel, or the owner's tools) in a sticky
 * side column. Used for the public page and for the consultant's own page,
 * so consultants see exactly what cabinets see.
 */
export default function ProfileView({ profile, aside, top }) {
  return (
    <div className="pv fade-in-up">
      {top}
      <ProfileHeader profile={profile} />
      <div className="pv-layout">
        <div className="pv-main">
          <ProfileBody profile={profile} />
        </div>
        {aside && <aside className="pv-aside">{aside}</aside>}
      </div>
    </div>
  );
}

function ProfileHeader({ profile }) {
  const available = profile.availability === "immediate";
  return (
    <header className="pv-header">
      <div className="pv-banner" />
      <div className="pv-header-body">
        <div className="pv-avatar" aria-hidden="true">
          <UserIcon size={40} />
        </div>
        <div className="pv-identity">
          <span className="pv-domain">{DOMAIN_LABELS[profile.domain]}</span>
          <h1>{profile.headline}</h1>
          <p className="pv-sub">
            <span>
              <PinIcon size={15} /> {profile.city || "Ville non precisee"}
            </span>
            <span className={`pv-availability ${available ? "on" : ""}`}>
              <span className="dot" /> {AVAILABILITY_LABELS[profile.availability]}
            </span>
          </p>
        </div>
      </div>

      <dl className="pv-stats">
        <div>
          <dt>Experience</dt>
          <dd>
            {profile.years_experience} <small>ans</small>
          </dd>
        </div>
        <div>
          <dt>TJM</dt>
          <dd>
            {profile.daily_rate ? (
              <>
                {formatMoney(profile.daily_rate).replace(" XOF", "")} <small>XOF / jour</small>
              </>
            ) : (
              <small>A discuter</small>
            )}
          </dd>
        </div>
        <div>
          <dt>Mode de travail</dt>
          <dd className="pv-stat-text">{WORK_MODE_LABELS[profile.work_mode]}</dd>
        </div>
        <div>
          <dt>Langues</dt>
          <dd className="pv-stat-text">{profile.languages || "—"}</dd>
        </div>
      </dl>
    </header>
  );
}

function yearsBetween(start, end) {
  const years = (end ?? new Date().getFullYear()) - start;
  if (years <= 0) return "moins d'un an";
  return `${years} an${years > 1 ? "s" : ""}`;
}

function Section({ icon, title, children }) {
  return (
    <section className="pv-section">
      <h2>
        <span className="pv-section-icon">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProfileBody({ profile }) {
  return (
    <>
      <Section icon={<UserIcon />} title="A propos">
        <p className="pv-bio">{profile.bio}</p>
      </Section>

      {profile.skills.length > 0 && (
        <Section icon={<CheckIcon />} title="Competences">
          <div className="pv-skills">
            {profile.skills.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </Section>
      )}

      {profile.experiences.length > 0 && (
        <Section icon={<BriefcaseIcon />} title="Experiences professionnelles">
          <ol className="pv-timeline">
            {profile.experiences.map((e, i) => (
              <li key={i}>
                <div className="pv-period">
                  <strong>
                    {e.start_year} – {e.end_year ?? "auj."}
                  </strong>
                  <span>{yearsBetween(e.start_year, e.end_year)}</span>
                </div>
                <div className="pv-entry">
                  <h3>
                    {e.title}
                    {e.end_year == null && <span className="pv-current">En cours</span>}
                  </h3>
                  <p className="pv-org">{e.organization || "Organisation confidentielle"}</p>
                  {e.description && <p className="pv-desc">{e.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {profile.diplomas.length > 0 && (
        <Section icon={<GraduationIcon />} title="Formation">
          <ul className="pv-cards">
            {profile.diplomas.map((d, i) => (
              <li key={i}>
                <h3>{d.title}</h3>
                <p>
                  {d.institution || "Etablissement non precise"}
                  {d.year ? ` · ${d.year}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.certifications.length > 0 && (
        <Section icon={<AwardIcon />} title="Certifications">
          <ul className="pv-certs">
            {profile.certifications.map((c, i) => (
              <li key={i}>
                <span className="pv-cert-icon">
                  <AwardIcon size={16} />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  {(c.issuer || c.year) && (
                    <span>
                      {c.issuer}
                      {c.issuer && c.year ? " · " : ""}
                      {c.year}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.languages && (
        <Section icon={<LanguageIcon />} title="Langues">
          <div className="pv-skills">
            {profile.languages
              .split(",")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l) => (
                <span key={l}>{l}</span>
              ))}
          </div>
        </Section>
      )}
    </>
  );
}
