import client from "./client";

/** `extra` carries the provider choice and, for SebPay, the Mobile Money details. */
export function initiatePayment(type, referenceId, extra = {}) {
  return client.post("/payments/initiate", { type, reference_id: referenceId, ...extra });
}

export function getPaymentOptions() {
  return client.get("/payments/options");
}

export function getSebPayOperators(country) {
  return client.get("/payments/sebpay/operators", { params: { country } });
}

export function confirmPayment(paymentId) {
  return client.post(`/payments/${paymentId}/confirm`);
}

export function getPaymentStatus(paymentId) {
  return client.get(`/payments/${paymentId}/status`);
}

export function listMyPayments() {
  return client.get("/payments/mine");
}

/** FastAPI sends `detail` as a string for our errors but as a list of objects
 *  for request-validation errors; only the string form is displayable. */
export function paymentErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

/** FastAPI request-validation errors come as a list; turn any error into one line. */
export function apiErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, "");
  return fallback;
}
