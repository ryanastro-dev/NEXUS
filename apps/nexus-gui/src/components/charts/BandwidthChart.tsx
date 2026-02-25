import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

interface BandwidthChartProps {
  data?: Array<{ time: string; value: number }>;
}

export default function BandwidthChart({ data = [] }: BandwidthChartProps) {
  const { theme } = useTheme();
  const { copy } = useLanguage();
  const bandwidthCopy = copy.common.bandwidthChart;
  const isDark = theme === 'dark';
  const hasData = data.length > 0;
  const values = data.map((entry) => entry.value);
  const peakMbps = hasData ? Math.max(...values) : null;
  const avgMbps = hasData
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
  const currentMbps = hasData ? values[values.length - 1] : null;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-secondary border border-theme rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-text-muted mb-1">{payload[0].payload.time}</p>
          <p className="text-sm font-semibold text-accent-blue">
            {payload[0].value} {bandwidthCopy.unitMbps}
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
      transition={{ delay: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-1">{bandwidthCopy.title}</h3>
          <p className="text-xs text-text-muted">{bandwidthCopy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-semibold text-accent-green">{bandwidthCopy.live}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} />
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
                label={{ value: bandwidthCopy.unitMbps, angle: -90, position: 'insideLeft', fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              <Bar 
                dataKey="value" 
                fill="url(#barGradient)" 
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            {bandwidthCopy.noTelemetry}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-theme">
        <div>
          <p className="text-xs text-text-muted mb-1">{bandwidthCopy.peak}</p>
          <p className="text-lg font-bold text-text-primary">
            {peakMbps ?? '--'} <span className="text-xs font-normal text-text-muted">{bandwidthCopy.unitMbps}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">{bandwidthCopy.average}</p>
          <p className="text-lg font-bold text-text-primary">
            {avgMbps ?? '--'} <span className="text-xs font-normal text-text-muted">{bandwidthCopy.unitMbps}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">{bandwidthCopy.current}</p>
          <p className="text-lg font-bold text-accent-blue">
            {currentMbps ?? '--'} <span className="text-xs font-normal text-text-muted">{bandwidthCopy.unitMbps}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
