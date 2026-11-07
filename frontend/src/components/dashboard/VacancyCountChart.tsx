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

import type { VacancyCountPoint } from "@/types/api";

export function VacancyCountChart({ history }: { history: VacancyCountPoint[] }) {
  return (
    <div className="history-chart" aria-label="Historical vacant dwelling count chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#dfe7e4" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="year"
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            tickLine={false}
            tick={{ fill: "#61706c", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            tick={{ fill: "#61706c", fontSize: 11 }}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), "Vacant dwellings"]}
            labelFormatter={(label) => `Year ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #dfe7e4",
              boxShadow: "0 12px 30px rgba(15, 51, 45, .12)",
            }}
          />
          <Line
            type="monotone"
            dataKey="vacant_homes"
            stroke="#087f73"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#f4a261" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
