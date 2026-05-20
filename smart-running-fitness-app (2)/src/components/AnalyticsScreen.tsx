import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid } from 'recharts';
import { DailyRecord, WeeklyData } from '../types';
import { generateWeeklyData, generateMonthlyData } from '../store';

interface Props {
  records: DailyRecord[];
  onBack: () => void;
}

export default function AnalyticsScreen({ records, onBack }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [metric, setMetric] = useState<'steps' | 'calories' | 'distance' | 'minutes'>('steps');

  const data: WeeklyData[] = period === 'week' ? generateWeeklyData(records) : generateMonthlyData(records);

  const metricConfig = {
    steps: { label: 'Bước chân', color: '#10b981', unit: 'bước', icon: '👣' },
    calories: { label: 'Calo', color: '#f97316', unit: 'kcal', icon: '🔥' },
    distance: { label: 'Quãng đường', color: '#3b82f6', unit: 'km', icon: '📏' },
    minutes: { label: 'Thời gian', color: '#a855f7', unit: 'phút', icon: '⏱️' },
  };

  const config = metricConfig[metric];
  const totalValue = data.reduce((sum, d) => sum + d[metric], 0);
  const avgValue = Math.round(totalValue / data.length);
  const maxValue = Math.max(...data.map(d => d[metric]));
  const activeDays = data.filter(d => d[metric] > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <h1 className="text-2xl font-bold">📊 Phân tích sức khỏe</h1>
        <p className="text-sm opacity-80">Theo dõi xu hướng và tiến độ</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Period toggle */}
        <div className="bg-white rounded-2xl p-1 flex shadow-sm">
          <button
            onClick={() => setPeriod('week')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${period === 'week' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}
          >
            Tuần
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${period === 'month' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}
          >
            Tháng
          </button>
        </div>

        {/* Metric tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map(key => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                metric === key ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-500'
              }`}
            >
              <span>{metricConfig[key].icon}</span>
              {metricConfig[key].label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <div className="text-xs text-gray-500">Tổng</div>
            <div className="text-lg font-bold" style={{ color: config.color }}>
              {metric === 'distance' ? totalValue.toFixed(1) : totalValue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">{config.unit}</div>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <div className="text-xs text-gray-500">TB/ngày</div>
            <div className="text-lg font-bold" style={{ color: config.color }}>
              {metric === 'distance' ? (avgValue).toFixed(1) : avgValue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">{config.unit}</div>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <div className="text-xs text-gray-500">Ngày tập</div>
            <div className="text-lg font-bold" style={{ color: config.color }}>
              {activeDays}
            </div>
            <div className="text-xs text-gray-400">ngày</div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{config.icon} {config.label}</h3>
            <span className="text-xs text-gray-400">Cao nhất: {metric === 'distance' ? maxValue.toFixed(1) : maxValue.toLocaleString()} {config.unit}</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: unknown) => [`${metric === 'distance' ? Number(value).toFixed(1) : Number(value).toLocaleString()} ${config.unit}`, config.label]}
                />
                <Bar dataKey={metric} fill={config.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart - Trend */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">📈 Xu hướng {config.label.toLowerCase()}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: unknown) => [`${metric === 'distance' ? Number(value).toFixed(1) : Number(value).toLocaleString()} ${config.unit}`, config.label]}
                />
                <Line type="monotone" dataKey={metric} stroke={config.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
