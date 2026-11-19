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
      <div className="h-64 flex items-center justify-center text-sm text-slate-400">
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
          <XAxis dataKey="wave" tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }} />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#16191e",
              borderRadius: "12px",
              border: "1px solid rgba(0,229,204,0.35)",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 600,
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
          <Line
            type="monotone"
            dataKey="lectures"
            name={labels.lectures}
            stroke="#00f0d8"
            strokeWidth={3}
            dot={{ r: 5, fill: "#00f0d8" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="practice"
            name={labels.practice}
            stroke="#ffe600"
            strokeWidth={3}
            dot={{ r: 5, fill: "#ffe600" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="materials"
            name={labels.materials}
            stroke="#34d399"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#34d399" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="organization"
            name={labels.organization}
            stroke="#38bdf8"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#38bdf8" }}
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
      <div className="h-64 flex items-center justify-center text-sm text-slate-400">
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }} />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#16191e",
              borderRadius: "12px",
              border: "1px solid rgba(0,229,204,0.35)",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 600,
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
          <Bar dataKey="lectures" name={labels.lectures} fill="#00f0d8" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="practice" name={labels.practice} fill="#ffe600" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="materials" name={labels.materials} fill="#34d399" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="organization" name={labels.organization} fill="#38bdf8" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
