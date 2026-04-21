import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';

export function SparklineChart({ points }: { points: { x: number; y: number }[] }) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Tooltip contentStyle={{ background: '#1B1838', border: 'none' }} />
          <Line type="monotone" dataKey="y" stroke="#FF3D8B" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
