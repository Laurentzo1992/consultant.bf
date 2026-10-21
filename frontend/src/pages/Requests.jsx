import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyConnectionRequests, listReceivedConnectionRequests } from "../api/connections";
import ConnectionCard from "../components/ConnectionCard";
import { useAuth } from "../context/AuthContext";

const COPY = {
  sent: {
    consultant: {
      title: "Mes candidatures",
      empty: "Vous n'avez pas encore postule a une mission.",
      cta: { to: "/missions", label: "Parcourir les missions" },
    },
    entreprise: {
      title: "Consultants contactes",
      empty: "Vous n'avez contacte aucun consultant pour l'instant.",
      cta: { to: "/consultants", label: "Parcourir les consultants" },
    },
  },
  received: {
    consultant: {
      title: "Propositions recues",
      empty: "Aucun cabinet ne vous a encore contacte. Un profil complet et des competences precises aident !",
      cta: { to: "/me/profile", label: "Ameliorer mon profil" },
    },
    entreprise: {
      title: "Candidatures recues",
      empty: "Aucune candidature pour l'instant.",
      cta: { to: "/me/missions", label: "Voir mes missions" },
    },
  },
};

/** `kind` = "sent" (I initiated and pay) or "received". */
export default function Requests({ kind }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const copy = COPY[kind][user.role];

  const load = () => {
    const fetcher = kind === "sent" ? listMyConnectionRequests : listReceivedConnectionRequests;
    fetcher()
      .then((res) => setRequests(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <div>
      <h1>{copy.title}</h1>
      <p className="hint">
        Chaque mise en relation est verifiee par notre equipe avant l'echange des coordonnees. Les identites restent
        masquees jusque-la.
      </p>
      {loading && <div className="spinner" />}
      {!loading && requests.length === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">💬</div>
          <p>{copy.empty}</p>
          <Link to={copy.cta.to} className="btn">
            {copy.cta.label}
          </Link>
        </div>
      )}
      <div className="grid">
        {requests.map((req) => (
          <ConnectionCard
            key={req.id}
            request={req}
            viewerRole={user.role}
            showPayment={kind === "sent"}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  );
}
