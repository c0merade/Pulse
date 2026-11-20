"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import type { Lang } from "@/lib/i18n";

export interface TrendPoint {
  wave: string;
  lectures: number;
  practice: number;
  materials: number;
  organization: number;
}

export function TrendLineChart({
  data,
  lang = "hy",
}: {
  data: TrendPoint[];
  lang?: Lang;
}) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        {lang === "hy" ? "Տրենդի տվյալներ դեռ չկան։" : "No survey trend data yet."}
      </div>
    );
  }

  const labels =
    lang === "hy"
      ? {
          lectures: "Դասախոսություններ",
          practice: "Պրակտիկա",
          materials: "Նյութեր",
          organization: "Կազմակերպում",
        }
      : {
          lectures: "Lectures",
          practice: "Practice",
          materials: "Materials",
          organization: "Organization",
        };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,110,115,0.16)" />
          <XAxis dataKey="wave" tick={{ fontSize: 12, fill: "#6e6e73", fontWeight: 500 }} />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: "#6e6e73", fontWeight: 500 }}
          />
          <Tooltip
            cursor={{ stroke: "rgba(217, 0, 216, 0.35)", strokeWidth: 1.5 }}
            contentStyle={{
              backgroundColor: "var(--surface)",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: "12px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
          <Line
            type="monotone"
            dataKey="lectures"
            name={labels.lectures}
            stroke="#d900d8"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#d900d8" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="practice"
            name={labels.practice}
            stroke="#0071e3"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0071e3" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="materials"
            name={labels.materials}
            stroke="#16a34a"
            strokeWidth={2.2}
            dot={{ r: 4, fill: "#16a34a" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="organization"
            name={labels.organization}
            stroke="#f59e0b"
            strokeWidth={2.2}
            dot={{ r: 4, fill: "#f59e0b" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface GroupComparePoint {
  name: string;
  lectures: number;
  practice: number;
  materials: number;
  organization: number;
}

export function ComparisonBarChart({
  data,
  lang = "hy",
}: {
  data: GroupComparePoint[];
  lang?: Lang;
}) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        {lang === "hy" ? "Համեմատության տվյալներ չկան։" : "No comparison data available."}
      </div>
    );
  }

  const labels =
    lang === "hy"
      ? {
          lectures: "Դասախոսություններ",
          practice: "Պրակտիկա",
          materials: "Նյութեր",
          organization: "Կազմակերպում",
        }
      : {
          lectures: "Lectures",
          practice: "Practice",
          materials: "Materials",
          organization: "Organization",
        };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,110,115,0.16)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6e6e73", fontWeight: 500 }} />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: "#6e6e73", fontWeight: 500 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(217, 0, 216, 0.06)" }}
            contentStyle={{
              backgroundColor: "var(--surface)",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: "12px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
          <Bar dataKey="lectures" name={labels.lectures} fill="#d900d8" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="practice" name={labels.practice} fill="#0071e3" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="materials" name={labels.materials} fill="#16a34a" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="organization" name={labels.organization} fill="#f59e0b" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
