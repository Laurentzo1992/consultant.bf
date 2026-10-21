// Fallback fees, only shown until GET /payments/options answers with the
// real ones (see usePrices). Keep in sync with backend/app/config.py.
export const DEFAULT_PRICES = {
  profile_publication: 1000,
  mission_publication: 2000,
  connection_request: 1000,
  currency: "XOF",
};

export const PAGE_SIZE = 12;

// Single source of truth for enum options in the UI. Values match the
// backend enums in app/models.py exactly.
export const DOMAINS = [
  { value: "strategie", label: "Strategie & management" },
  { value: "finance", label: "Finance, audit & comptabilite" },
  { value: "rh", label: "Ressources humaines" },
  { value: "informatique", label: "Informatique & digital" },
  { value: "juridique", label: "Juridique & fiscal" },
  { value: "marketing", label: "Marketing & communication" },
  { value: "ingenierie", label: "Ingenierie & BTP" },
  { value: "sante", label: "Sante" },
  { value: "agriculture", label: "Agriculture & agro-industrie" },
  { value: "environnement", label: "Environnement & energie" },
  { value: "education", label: "Education & formation" },
  { value: "logistique", label: "Logistique & supply chain" },
  { value: "suivi_evaluation", label: "Suivi-evaluation de projets" },
  { value: "autre", label: "Autre" },
];

export const WORK_MODES = [
  { value: "sur_site", label: "Sur site" },
  { value: "hybride", label: "Hybride" },
  { value: "distance", label: "A distance" },
];

export const AVAILABILITIES = [
  { value: "immediate", label: "Disponible immediatement" },
  { value: "under_1_month", label: "Disponible sous 1 mois" },
  { value: "over_1_month", label: "Disponible dans plus d'1 mois" },
];

export const COMPANY_SIZES = [
  { value: "tpe", label: "TPE (moins de 10)" },
  { value: "pme", label: "PME (10 a 249)" },
  { value: "grande", label: "Grande entreprise (250+)" },
  { value: "ong", label: "ONG / association" },
  { value: "public", label: "Institution publique" },
];

const toMap = (list) => Object.fromEntries(list.map((o) => [o.value, o.label]));
export const DOMAIN_LABELS = toMap(DOMAINS);
export const WORK_MODE_LABELS = toMap(WORK_MODES);
export const AVAILABILITY_LABELS = toMap(AVAILABILITIES);
export const COMPANY_SIZE_LABELS = toMap(COMPANY_SIZES);

export const LISTING_STATUS_LABELS = {
  draft: "Brouillon",
  pending_payment: "En attente de paiement",
  published: "Publie",
  rejected: "Rejete",
  archived: "Masque",
};

export const CONNECTION_STATUS_LABELS = {
  pending_payment: "En attente de paiement",
  pending_admin: "En cours de validation",
  approved: "Validee",
  rejected: "Rejetee",
};

export function formatMoney(amount, currency = "XOF") {
  if (amount == null) return "—";
  return `${Number(amount).toLocaleString("fr-FR")} ${currency}`;
}
