'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RegressionDayBucket } from '@/lib/api';

interface RegressionChartProps {
  series: RegressionDayBucket[];
}

export function RegressionChart({ series }: RegressionChartProps) {
  if (series.length === 0) return null;

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e2e6" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#41454d' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#41454d' }} />
          <Tooltip
            contentStyle={{
              borderRadius: 6,
              border: '1px solid #dddddd',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="passToPass"
            name="Pass-to-pass regressions"
            stroke="#aa2d00"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="newFail"
            name="New failures"
            stroke="#254fad"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
