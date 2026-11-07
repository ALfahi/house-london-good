"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HistoryPoint } from "@/types/api";

export function HistoryChart({ history }: { history: HistoryPoint[] }) {
  return (
    <div className="history-chart" aria-label="Historical vacancy rate chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#dfe7e4" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#61706c", fontSize: 12 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#61706c", fontSize: 12 }}
            tickFormatter={(value: number) => `${value}%`}
            domain={["dataMin - 0.4", "dataMax + 0.4"]}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "Vacancy rate"]}
            labelFormatter={(label) => `Year ${label}`}
            contentStyle={{ borderRadius: 12, border: "1px solid #dfe7e4", boxShadow: "0 12px 30px rgba(15, 51, 45, .12)" }}
          />
          <Line
            type="monotone"
            dataKey="vacancy_rate"
            stroke="#087f73"
            strokeWidth={3}
            dot={{ r: 4, fill: "#f7faf8", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#f4a261" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
