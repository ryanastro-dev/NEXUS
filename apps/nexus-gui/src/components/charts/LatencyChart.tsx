import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

interface LatencyChartProps {
  data?: Array<{ time: string; value: number }>;
}

export default function LatencyChart({ data = [] }: LatencyChartProps) {
  const { theme } = useTheme();
  const { copy } = useLanguage();
  const latencyCopy = copy.common.latencyChart;
  const isDark = theme === 'dark';
  const hasData = data.length > 0;
  const values = data.map((entry) => entry.value);
  const minLatency = hasData ? Math.min(...values) : null;
  const maxLatency = hasData ? Math.max(...values) : null;
  const avgLatency = hasData
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-secondary border border-theme rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-text-muted mb-1">{payload[0].payload.time}</p>
          <p className="text-sm font-semibold text-accent-blue">
            {payload[0].value}{latencyCopy.unitMs}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="bg-bg-secondary border border-theme rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-text-primary mb-1">{latencyCopy.title}</h3>
        <p className="text-xs text-text-muted">{latencyCopy.subtitle}</p>
      </div>

      {/* Chart */}
      <div className="h-48">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke={isDark ? '#64748B' : '#94A3B8'}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke={isDark ? '#64748B' : '#94A3B8'}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: latencyCopy.unitMs, angle: -90, position: 'insideLeft', fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#areaGradient)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            {latencyCopy.noTelemetry}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-theme">
        <div>
          <p className="text-xs text-text-muted mb-1">{latencyCopy.min}</p>
          <p className="text-lg font-bold text-accent-green">
            {minLatency ?? '--'} <span className="text-xs font-normal text-text-muted">{latencyCopy.unitMs}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">{latencyCopy.average}</p>
          <p className="text-lg font-bold text-text-primary">
            {avgLatency ?? '--'} <span className="text-xs font-normal text-text-muted">{latencyCopy.unitMs}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">{latencyCopy.max}</p>
          <p className="text-lg font-bold text-accent-amber">
            {maxLatency ?? '--'} <span className="text-xs font-normal text-text-muted">{latencyCopy.unitMs}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
