/** Matching score (0-100) pill, coloured by strength. */
export default function ScoreBadge({ score }) {
  if (score == null) return null;
  const level = score >= 75 ? "" : score >= 50 ? "mid" : "low";
  return (
    <span className={`score-badge ${level}`} title="Score de compatibilite">
      {score}%
    </span>
  );
}
