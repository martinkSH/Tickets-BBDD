'use client'

import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { fmtBucket } from '@/lib/estadisticas'

// ── Tendencia: creados vs resueltos ─────────────────────────────────────────
export function TendenciaChart({
  data, bucket,
}: { data: { periodo: string; creados: number; resueltos: number }[]; bucket: string }) {
  if (!data?.length) return <Empty />
  const rows = data.map(d => ({ ...d, label: fmtBucket(d.periodo, bucket) }))
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: '18px 14px 8px' }}>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="gCreados" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f6ef7" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#4f6ef7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={{ stroke: '#eee' }} minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 700, color: '#111827' }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconType="circle" />
          <Area type="monotone" dataKey="creados" name="Creados" stroke="#4f6ef7" strokeWidth={2} fill="url(#gCreados)" />
          <Line type="monotone" dataKey="resueltos" name="Resueltos" stroke="#16a34a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Donut SLA ───────────────────────────────────────────────────────────────
export function SlaDonut({ pct, slaHoras }: { pct: number; slaHoras: number }) {
  const val = Math.max(0, Math.min(100, pct))
  const color = val >= 90 ? '#16a34a' : val >= 75 ? '#d97706' : '#dc2626'
  const data = [{ name: 'ok', value: val }, { name: 'resto', value: 100 - val }]
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dentro de SLA</p>
      <div style={{ position: 'relative', width: 150, height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={52} outerRadius={70} startAngle={90} endAngle={-270} stroke="none">
              <Cell fill={color} />
              <Cell fill="#f1f1f4" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 30, fontWeight: 700, color }}>{val}%</span>
        </div>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>resueltos &lt; {slaHoras} hs háb.</p>
    </div>
  )
}

// ── Aging del backlog ───────────────────────────────────────────────────────
export function AgingChart({ buckets }: { buckets: { label: string; total: number }[] }) {
  if (!buckets?.length) return <Empty />
  const COLORS = ['#16a34a', '#d97706', '#ea580c', '#dc2626']
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: '18px 14px 8px' }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={buckets} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#eee' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#fafafa' }} />
          <Bar dataKey="total" name="Abiertos" radius={[5, 5, 0, 0]}>
            {buckets.map((_, i) => <Cell key={i} fill={COLORS[i] || '#6b7280'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: 10, border: '1px solid #eee', fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '8px 12px',
}

function Empty() {
  return <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin datos en este período</div>
}
