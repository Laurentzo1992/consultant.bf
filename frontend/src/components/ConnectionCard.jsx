import { useState } from "react";
import { Link } from "react-router-dom";
import { downloadConsultantCv, getContact, openBlob } from "../api/connections";
import { apiErrorMessage } from "../api/payments";
import PaymentBox from "./PaymentBox";
import { ChatIcon } from "./icons";
import usePrices from "../hooks/usePrices";
import { CONNECTION_STATUS_LABELS } from "../constants";

/** Title of a request card, from the point of view of `viewerRole`. */
function describe(request, viewerRole) {
  const mission = request.mission ? ` — mission « ${request.mission.title} »` : "";
  if (viewerRole === "consultant") {
    const company = request.company.company_name;
    return request.initiated_by === "consultant"
      ? `Candidature envoyee${mission}`
      : `${company} (${request.company_sector || "cabinet"}) souhaite vous rencontrer${mission}`;
  }
  const who = request.consultant.full_name === "Identite masquee"
    ? request.consultant_headline || "Consultant"
    : `${request.consultant.full_name} — ${request.consultant_headline || "consultant"}`;
  return request.initiated_by === "entreprise" ? `${who}${mission}` : `Candidature de ${who}${mission}`;
}

export default function ConnectionCard({ request, viewerRole, onChanged, showPayment }) {
  const prices = usePrices();
  const [contact, setContact] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const openCv = async () => {
    setError("");
    try {
      openBlob((await downloadConsultantCv(request.id)).data);
    } catch (err) {
      setError("Impossible d'ouvrir le CV");
    }
  };

  const revealContact = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await getContact(request.id);
      setContact(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'afficher le contact"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card fade-in-up">
      <h2 style={{ fontSize: "1.05rem" }}>{describe(request, viewerRole)}</h2>
      <span className={`status-pill ${request.status}`}>
        {CONNECTION_STATUS_LABELS[request.status] || request.status}
      </span>
      <p className="meta" style={{ marginTop: "0.6rem" }}>
        Le {new Date(request.created_at).toLocaleDateString("fr-FR")}
      </p>

      {request.message && <p className="message-quote">« {request.message} »</p>}

      {request.status === "pending_admin" && (
        <p className="hint">
          Paiement confirme. Notre equipe verifie chaque mise en relation avant de partager les coordonnees —
          generalement sous 24 h ouvrees.
        </p>
      )}

      {showPayment && request.status === "pending_payment" && (
        <PaymentBox
          type="connection_request"
          referenceId={request.id}
          amount={prices.connection_request}
          currency={prices.currency}
          onPaid={onChanged}
        />
      )}

      {request.status === "rejected" && request.rejection_reason && (
        <p className="hint">Motif : {request.rejection_reason}</p>
      )}

      {request.status === "approved" && !contact && (
        <button style={{ marginTop: "0.8rem" }} disabled={busy} onClick={revealContact}>
          Voir les coordonnees
        </button>
      )}

      {contact && (
        <div className="contact-box">
          <p>
            <strong>{contact.full_name}</strong>
            {contact.company_name ? ` — ${contact.company_name}` : ""}
          </p>
          <p>Telephone : {contact.phone}</p>
          <p>
            Email : <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </p>
          {contact.whatsapp && (
            <a
              className="btn btn-whatsapp"
              href={`https://wa.me/${contact.phone.replace("+", "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <ChatIcon />
              Contacter sur WhatsApp
            </a>
          )}
        </div>
      )}

      {request.status === "approved" && viewerRole === "entreprise" && request.consultant_has_cv && (
        <div className="card-actions">
          <button className="btn-outline btn-sm" onClick={openCv}>
            📄 Telecharger le CV
          </button>
        </div>
      )}

      {request.mission && viewerRole === "consultant" && (
        <div className="card-actions">
          <Link to={`/missions/${request.mission.id}`}>Voir la mission →</Link>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
