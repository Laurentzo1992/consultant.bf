import { useEffect, useState } from "react";
import { getPaymentOptions } from "../api/payments";
import { DEFAULT_PRICES } from "../constants";

let cached = null;

/** Current fees from the backend (GET /payments/options), fetched once per page load. */
export default function usePrices() {
  const [prices, setPrices] = useState(cached ?? DEFAULT_PRICES);

  useEffect(() => {
    if (cached) return;
    getPaymentOptions()
      .then((res) => {
        cached = res.data.prices;
        setPrices(cached);
      })
      .catch(() => {});
  }, []);

  return prices;
}
