"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const sampleData = [
  { name: "Sem 1", avance: 25 },
  { name: "Sem 2", avance: 45 },
  { name: "Sem 3", avance: 65 },
  { name: "Sem 4", avance: 85 },
  { name: "Sem 5", avance: 100 },
];

export function ProgressChart() {
  return (
    <div className="h-[120px] min-h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sampleData}>
          <XAxis dataKey="name" stroke="#86868B" fontSize={12} />
          <YAxis stroke="#86868B" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D2D2D7",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          />
          <Bar dataKey="avance" fill="#007AFF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
