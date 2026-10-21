import { Link } from "react-router-dom";
import ScoreBadge from "./ScoreBadge";
import { AVAILABILITY_LABELS, COMPANY_SIZE_LABELS, DOMAIN_LABELS, WORK_MODE_LABELS, formatMoney } from "../constants";

/** Skill chips; those that match `highlight` (e.g. a mission's required
 *  skills) are filled, using the same containment rule as the backend. */
export function SkillChips({ items, highlight = [], max = 6 }) {
  if (!items?.length) return null;
  const isMatched = (s) => highlight.some((w) => w === s || w.includes(s) || s.includes(w));
  return (
    <div className="chips">
      {items.slice(0, max).map((s) => (
        <span key={s} className={`chip ${isMatched(s) ? "matched" : ""}`}>
          {s}
        </span>
      ))}
      {items.length > max && <span className="chip">+{items.length - max}</span>}
    </div>
  );
}

export function ProfileCard({ profile, highlightSkills, style }) {
  return (
    <Link to={`/consultants/${profile.id}`} className="card listing-card fade-in-up" style={style}>
      <ScoreBadge score={profile.score} />
      <span className="domain-tag">{DOMAIN_LABELS[profile.domain]}</span>
      <h2>{profile.headline}</h2>
      <p className="meta">
        {profile.years_experience} ans d'experience{profile.city ? ` · ${profile.city}` : ""}
      </p>
      <SkillChips items={profile.skills} highlight={highlightSkills} />
      <ul className="facts">
        <li>
          {profile.daily_rate ? (
            <>
              <strong>{formatMoney(profile.daily_rate)}</strong> / jour
            </>
          ) : (
            "TJM a discuter"
          )}
        </li>
        <li>{WORK_MODE_LABELS[profile.work_mode]}</li>
        <li>{AVAILABILITY_LABELS[profile.availability]}</li>
      </ul>
    </Link>
  );
}

export function MissionCard({ mission, highlightSkills, style }) {
  return (
    <Link to={`/missions/${mission.id}`} className="card listing-card fade-in-up" style={style}>
      <ScoreBadge score={mission.score} />
      <span className="domain-tag">{DOMAIN_LABELS[mission.domain]}</span>
      <h2>{mission.title}</h2>
      <p className="meta">
        {mission.company.sector || "Organisation"}
        {mission.company.size ? ` · ${COMPANY_SIZE_LABELS[mission.company.size]}` : ""}
      </p>
      <SkillChips items={mission.required_skills} highlight={highlightSkills} />
      <ul className="facts">
        <li>
          {WORK_MODE_LABELS[mission.work_mode]}
          {mission.city ? ` · ${mission.city}` : ""}
        </li>
        {mission.duration && <li>{mission.duration}</li>}
        {mission.max_daily_rate && (
          <li>
            jusqu'a <strong>{formatMoney(mission.max_daily_rate)}</strong> / jour
          </li>
        )}
      </ul>
    </Link>
  );
}
