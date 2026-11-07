"use client";

import { useEffect, useState } from "react";

import type { ConstituenciesResponse } from "@/types/api";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatChange(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function HousePricePanel({
  data,
  error,
}: {
  data: ConstituenciesResponse | null;
  error: string | null;
}) {
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    if (data?.items.length && !data.items.some((item) => item.ons_code === selectedCode)) {
      setSelectedCode(data.items[0].ons_code);
    }
  }, [data, selectedCode]);

  if (error) {
    return (
      <section className="panel market-panel">
        <span className="eyebrow">Economic context</span>
        <h2>House prices unavailable</h2>
        <p className="market-message">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const selected = data.items.find((item) => item.ons_code === selectedCode) ?? data.items[0];
  if (!selected) return null;

  return (
    <section className="panel market-panel">
      <div className="panel-heading market-heading">
        <div>
          <span className="eyebrow">Economic context</span>
          <h2>House prices</h2>
        </div>
        <span className="market-median">
          <small>London median</small>
          {formatPrice(data.summary.median_house_price_gbp)}
        </span>
      </div>

      <label className="constituency-control" htmlFor="constituency">
        <span>Parliamentary constituency</span>
        <select
          id="constituency"
          value={selected.ons_code}
          onChange={(event) => setSelectedCode(event.target.value)}
        >
          {data.items.map((item) => (
            <option key={item.ons_code} value={item.ons_code}>
              {item.constituency}
            </option>
          ))}
        </select>
      </label>

      <div className="market-price-row">
        <div>
          <span>House price</span>
          <strong>{formatPrice(selected.house_price_gbp)}</strong>
        </div>
        <span className={selected.house_price_1y_change_pct >= 0 ? "change-up" : "change-down"}>
          {formatChange(selected.house_price_1y_change_pct)} <small>1 year</small>
        </span>
      </div>

      <div className="market-stat-grid">
        <div>
          <span>5-year change</span>
          <strong>{formatChange(selected.house_price_5y_change_pct)}</strong>
        </div>
        <div>
          <span>Price / earnings</span>
          <strong>
            {selected.price_to_earnings_ratio == null
              ? "—"
              : `${selected.price_to_earnings_ratio.toFixed(1)}×`}
          </strong>
        </div>
        <div>
          <span>Empty homes</span>
          <strong>{selected.empty_homes_pct.toFixed(2)}%</strong>
        </div>
      </div>

      <p className="market-note">
        Constituency estimates are shown separately from the borough map because the boundaries differ.
      </p>
    </section>
  );
}
