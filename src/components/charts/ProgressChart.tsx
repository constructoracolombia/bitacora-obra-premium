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
          <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
          <YAxis stroke="#a3a3a3" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1A1A",
              border: "1px solid #262626",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="avance" fill="#FFB800" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
