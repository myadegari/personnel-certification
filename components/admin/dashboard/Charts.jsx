"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const AXIS = { stroke: "var(--color-muted-foreground)", fontSize: 12 };
const GRID_STROKE = "var(--border)";
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "0 8px 30px rgb(0 0 0 / 0.08)",
  fontFamily: "inherit",
};

export function EnrollmentsAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="label" {...AXIS} tickLine={false} axisLine={false} reversed />
        <YAxis {...AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="count"
          name="ثبت‌نام"
          stroke="var(--chart-2)"
          strokeWidth={2.5}
          fill="url(#enrollFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Semantic chart-token palette. Slices (and the legend dots below) resolve
// their color through donutColorFor so meaning never relies on hue alone:
// success/approved → chart-2, pending/warning → chart-4, rejected → chart-1,
// other/info → chart-3.
const DONUT_COLORS = {
  success: "var(--chart-2)",
  pending: "var(--chart-4)",
  rejected: "var(--chart-1)",
  other: "var(--chart-3)",
};

const donutColorFor = (name) => {
  const label = String(name || "");
  if (/(approved|success|تایید|موفق)/i.test(label)) return DONUT_COLORS.success;
  if (/(pending|waiting|انتظار)/i.test(label)) return DONUT_COLORS.pending;
  if (/(rejected|رد\s)/i.test(label)) return DONUT_COLORS.rejected;
  return DONUT_COLORS.other;
};

export function StatusDonut({ data }) {
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={donutColorFor(entry.name)} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {data.map((entry, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: donutColorFor(entry.name) }}
            />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// Truncate long Persian course names on the category axis.
const truncateTick = (value) => {
  const label = String(value ?? "");
  return label.length > 12 ? `${label.slice(0, 12)}…` : label;
};

export function TopCoursesBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
        <XAxis type="number" {...AXIS} tickLine={false} axisLine={false} allowDecimals={false} reversed />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          {...AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={truncateTick}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" name="ثبت‌نام" fill="var(--chart-2)" radius={[8, 0, 0, 8]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
