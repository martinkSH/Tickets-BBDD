'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'

// ── Config áreas BBDD ──────────────────────────────────────────────────────
const AREAS = ['GRUPOS','FITS','ALIWEN','B2C','OTRO']
const AREA_COLORS: Record<string,{bg:string;color:string;header:string}> = {
  GRUPOS: { bg:'#fef3c7', color:'#92400e', header:'#d97706' },
  FITS:   { bg:'#dbeafe', color:'#1e40af', header:'#2563eb' },
  ALIWEN: { bg:'#d1fae5', color:'#065f46', header:'#059669' },
  B2C:    { bg:'#ede9fe', color:'#5b21b6', header:'#7c3aed' },
  OTRO:   { bg:'#f3f4f6', color:'#374151', header:'#6b7280' },
}

// ── Config sistemas IT ─────────────────────────────────────────────────────
const SISTEMAS = ['Tourplan','Pythagoras/Bazar','Backend B2C','Vamoos','Otro']
const SIS_COLORS: Record<string,{bg:string;color:string;header:string}> = {
  'Tourplan':        { bg:'#dbeafe', color:'#1e40af', header:'#2563eb' },
  'Pythagoras/Bazar':{ bg:'#fef3c7', color:'#92400e', header:'#d97706' },
  'Backend B2C':     { bg:'#d1fae5', color:'#065f46', header:'#059669' },
  'Vamoos':          { bg:'#ede9fe', color:'#5b21b6', header:'#7c3aed' },
  'Otro':            { bg:'#f3f4f6', color:'#374151', header:'#6b7280' },
}

type Sector = 'bbdd' | 'it'

// ── Helpers UI ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin:'28px 0 14px', fontSize:13, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em' }}>{children}</h2>
}
function StatCard({ label, value, sub, color }: { label:string; value:string|number; sub?:string; color?:string }) {
  return (
    <div style={{ background:'white', borderRadius:12, padding:'18px 22px', border:'1px solid #f0f0f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
      <p style={{ margin:0, fontSize:30, fontWeight:700, color:color||'#111827', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ margin:'4px 0 0', fontSize:11, color:'#9ca3af' }}>{sub}</p>}
    </div>
  )
}
function RangosGrid({ rangos, color='#4f6ef7' }: { rangos:{label:string;total:number}[]; color?:string }) {
  const total = rangos.reduce((s,r)=>s+r.total,0)
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
      {rangos.map((r,i) => {
        const pct = total > 0 ? Math.round(r.total/total*100) : 0
        return (
          <div key={i} style={{ background:'white', border:'1px solid #f0f0f0', borderRadius:12, padding:'16px 18px' }}>
            <p style={{ margin:'0 0 6px', fontSize:11, color:'#9ca3af', fontWeight:600 }}>{r.label}</p>
            <p style={{ margin:'0 0 8px', fontSize:26, fontWeight:700, color:'#111827', lineHeight:1 }}>{r.total}</p>
            <div style={{ height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2 }}/>
            </div>
            <p style={{ margin:'5px 0 0', fontSize:11, color:'#9ca3af' }}>{pct}%</p>
          </div>
        )
      })}
    </div>
  )
}
function DiasGrid({ dias, color='#4f6ef7' }: { dias:{label:string;total:number}[]; color?:string }) {
  const max = Math.max(...dias.map(d=>d.total),1)
  const total = dias.reduce((s,d)=>s+d.total,0)
  const DIA_COLORS: Record<string,string> = { 'Lunes':'#4f6ef7','Martes':'#7c3aed','Miércoles':'#0891b2','Jueves':'#059669','Viernes':'#d97706','Sábado':'#dc2626','Domingo':'#db2777' }
  return (
    <div style={{ background:'white', border:'1px solid #f0f0f0', borderRadius:12, padding:'20px', display:'flex', gap:12, alignItems:'flex-end' }}>
      {dias.map((d,i) => {
        const pct = Math.round(d.total/total*100)||0
        const barH = Math.round((d.total/max)*120)
        const isWeekend = d.label==='Sábado'||d.label==='Domingo'
        const barColor = color!=='#4f6ef7' ? color : (DIA_COLORS[d.label]||'#4f6ef7')
        return (
          <div key={d.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{d.total}</span>
            <div style={{ width:'100%', height:120, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
              <div style={{ width:'70%', height:barH||2, borderRadius:'4px 4px 0 0', background:isWeekend?'#e5e7eb':barColor, opacity:isWeekend?0.6:1 }}/>
            </div>
            <span style={{ fontSize:11, fontWeight:600, color:isWeekend?'#9ca3af':'#374151', textAlign:'center' }}>{d.label.slice(0,3)}</span>
            <span style={{ fontSize:10, color:'#9ca3af' }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
function ResponsableTable({ rows, totalActual }: { rows:any[]; totalActual:number }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:12, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'#f9fafb' }}>
          {['Responsable','Total','Resueltos','Prom. resolución'].map(h=>(
            <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r,i) => {
            const prom = r.cantHoras > 0 ? (r.sumaHoras/r.cantHoras).toFixed(1) : '—'
            const pct = totalActual > 0 ? Math.round(r.total/totalActual*100) : 0
            return (
              <tr key={i} style={{ borderTop:'1px solid #f0f0f0' }}>
                <td style={{ padding:'11px 14px', fontWeight:600 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'#4f6ef7', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{r.nombre.charAt(0)}</div>
                    {r.nombre}
                  </div>
                </td>
                <td style={{ padding:'11px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:70, height:5, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:'#4f6ef7', borderRadius:3 }}/>
                    </div>
                    <span style={{ fontWeight:600 }}>{r.total}</span>
                  </div>
                </td>
                <td style={{ padding:'11px 14px', color:'#16a34a', fontWeight:600 }}>{r.resueltos}</td>
                <td style={{ padding:'11px 14px', color:'#7c3aed', fontWeight:600 }}>{prom!=='—'?`${prom} hs`:'—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
function SolicitanteTable({ rows }: { rows:any[] }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:12, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'#f9fafb' }}>
          {['Mail','Tickets','Resueltos'].map(h=>(
            <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((e,i)=>(
            <tr key={i} style={{ borderTop:'1px solid #f0f0f0' }}>
              <td style={{ padding:'10px 14px', color:'#374151' }}>{e.mail}</td>
              <td style={{ padding:'10px 14px', fontWeight:600 }}>{e.total}</td>
              <td style={{ padding:'10px 14px', color:'#16a34a', fontWeight:600 }}>{e.resueltos||'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function TiposTable({ rows, color='#4f6ef7' }: { rows:{tipo:string;total:number}[]; color?:string }) {
  const total = rows.reduce((s,r)=>s+r.total,0)
  if (!rows.length) return <p style={{ color:'#9ca3af', fontSize:13, padding:'16px 0' }}>Sin datos aún</p>
  return (
    <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:12, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ background:'#f9fafb' }}>
          {['Tipo','Tickets','Porcentaje'].map(h=>(
            <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r,i)=>{
            const pct = total>0?Math.round(r.total/total*100):0
            return (
              <tr key={i} style={{ borderTop:'1px solid #f0f0f0' }}>
                <td style={{ padding:'10px 14px', fontWeight:500 }}>{r.tipo}</td>
                <td style={{ padding:'10px 14px', fontWeight:700 }}>{r.total}</td>
                <td style={{ padding:'10px 14px', minWidth:160 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, height:5, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3 }}/>
                    </div>
                    <span style={{ fontSize:12, color:'#6b7280', minWidth:32 }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tipos ──────────────────────────────────────────────────────────────────
interface GlobalStatsBBDD {
  resumen: { totalActual:number; recibidosAhora:number; asignadosAhora:number; resueltosAhora:number; promHoras:number }
  porResponsable: any[]; porEmisor: any[]; rangos: any[]; dias: any[]
  atrasados: any[]; porTipoTicket: any[]
}
interface AreaStats {
  total:number; porEstado:Record<string,number>; porSolicitante:any[]
  rangos:any[]; dias:any[]; porTipo:any[]
}
interface GlobalStatsIT {
  resumen: { totalActual:number; recibidosAhora:number; asignadosAhora:number; pendientesAhora:number; resueltosAhora:number; promHoras:number }
  porSistema: any[]; porResponsable: any[]; porSolicitante: any[]
  rangos: any[]; dias: any[]; atrasados: any[]
}

// ── Componente principal ───────────────────────────────────────────────────
export default function EstadisticasPage() {
  const [perfil, setPerfil] = useState<Perfil|null>(null)
  const [sector, setSector] = useState<Sector>('bbdd')
  const [activeTab, setActiveTab] = useState('general')
  const [bbddStats, setBbddStats] = useState<GlobalStatsBBDD|null>(null)
  const [areaStats, setAreaStats] = useState<AreaStats|null>(null)
  const [itStats, setItStats] = useState<GlobalStatsIT|null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date|null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      if (p.rol !== 'admin') { router.push('/dashboard'); return }
      setPerfil(p)
      await loadBBDD()
    }
    init()
  }, [])

  const loadBBDD = async () => {
    setLoading(true)
    const res = await fetch('/api/stats?t='+Date.now())
    if (res.ok) { setBbddStats(await res.json()); setLastUpdate(new Date()) }
    setLoading(false)
  }
  const loadArea = async (area: string) => {
    setLoading(true); setAreaStats(null)
    const res = await fetch(`/api/stats-area?area=${area}&t=`+Date.now())
    if (res.ok) { setAreaStats(await res.json()); setLastUpdate(new Date()) }
    setLoading(false)
  }
  const loadIT = async () => {
    setLoading(true); setItStats(null)
    const res = await fetch('/api/stats-it?t='+Date.now())
    if (res.ok) { setItStats(await res.json()); setLastUpdate(new Date()) }
    setLoading(false)
  }

  const handleSector = (s: Sector) => {
    setSector(s); setActiveTab('general')
    if (s === 'bbdd') loadBBDD()
    else loadIT()
  }
  const handleTab = (tab: string) => {
    setActiveTab(tab)
    if (sector === 'bbdd') {
      if (tab === 'general') loadBBDD()
      else loadArea(tab)
    } else {
      loadIT()
    }
  }
  const handleRefresh = () => handleTab(activeTab)

  if (!perfil) return null

  const sectorBtnStyle = (s: Sector): React.CSSProperties => ({
    padding:'10px 28px', fontSize:14, fontWeight:700, border:'none',
    borderRadius:10, cursor:'pointer', transition:'all 0.15s',
    background: sector===s ? '#111827' : 'white',
    color: sector===s ? 'white' : '#6b7280',
    boxShadow: sector===s ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
  })
  const tabStyle = (tab: string): React.CSSProperties => {
    const active = activeTab===tab
    const cfg = sector==='bbdd' ? AREA_COLORS[tab] : SIS_COLORS[tab]
    return {
      padding:'7px 16px', fontSize:13, fontWeight:600, border:'none',
      borderRadius:8, cursor:'pointer', transition:'all 0.15s',
      background: active ? (cfg ? cfg.header : '#111827') : 'white',
      color: active ? 'white' : '#6b7280',
      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    }
  }

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding:32, maxWidth:1000 }}>
        {/* Header */}
        <div style={{ marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:700, color:'#111827' }}>Estadísticas</h1>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>
              {lastUpdate && `Actualizado ${lastUpdate.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`}
            </p>
          </div>
          <button onClick={handleRefresh} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151', opacity:loading?0.6:1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            {loading?'Cargando…':'Actualizar'}
          </button>
        </div>

        {/* Selector BBDD / IT */}
        <div style={{ display:'flex', gap:8, marginBottom:20, padding:8, background:'#f9fafb', borderRadius:14, border:'1px solid #f0f0f0', width:'fit-content' }}>
          <button onClick={() => handleSector('bbdd')} style={sectorBtnStyle('bbdd')}>📋 Estadísticas BBDD</button>
          <button onClick={() => handleSector('it')}   style={sectorBtnStyle('it')}>🖥️ Estadísticas IT</button>
        </div>

        {/* Tabs del sector */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:28, padding:'10px 12px', background:'#f9fafb', borderRadius:12, border:'1px solid #f0f0f0' }}>
          {sector === 'bbdd' ? (
            <>
              <button onClick={() => handleTab('general')} style={tabStyle('general')}>📊 General</button>
              {AREAS.map(a => <button key={a} onClick={() => handleTab(a)} style={tabStyle(a)}>{a}</button>)}
            </>
          ) : (
            <button onClick={() => handleTab('general')} style={tabStyle('general')}>📊 General IT</button>
          )}
        </div>

        {loading && <div style={{ padding:'80px 0', textAlign:'center', color:'#9ca3af', fontSize:14 }}>Cargando estadísticas…</div>}

        {/* ── BBDD General ── */}
        {!loading && sector==='bbdd' && activeTab==='general' && bbddStats && (
          <BBDDGeneralView stats={bbddStats} />
        )}

        {/* ── BBDD Área ── */}
        {!loading && sector==='bbdd' && activeTab!=='general' && areaStats && (
          <BBDDAreaView area={activeTab} stats={areaStats} />
        )}

        {/* ── IT General ── */}
        {!loading && sector==='it' && itStats && (
          <ITGeneralView stats={itStats} />
        )}
      </div>
    </AppShell>
  )
}

// ── BBDD General ───────────────────────────────────────────────────────────
function BBDDGeneralView({ stats }: { stats: GlobalStatsBBDD }) {
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        <StatCard label="Total tickets" value={stats.resumen.totalActual.toLocaleString()} />
        <StatCard label="Sin asignar"   value={stats.resumen.recibidosAhora}  color="#ea580c" />
        <StatCard label="En curso"      value={stats.resumen.asignadosAhora}  color="#2563eb" />
        <StatCard label="Resueltos"     value={stats.resumen.resueltosAhora.toLocaleString()} color="#16a34a" />
        <StatCard label="Prom. resolución" value={`${stats.resumen.promHoras.toFixed(1)} hs`} sub="horas hábiles" color="#7c3aed" />
      </div>

      {stats.atrasados.length > 0 && (
        <>
          <SectionTitle>⏰ Con +24 hs hábiles sin resolver ({stats.atrasados.length})</SectionTitle>
          <div style={{ background:'#fff', border:'1px solid #fecaca', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#fee2e2' }}>
                {['Ticket','Responsable','Estado','Hs hábiles'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#dc2626', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {stats.atrasados.map((a,i)=>(
                  <tr key={i} style={{ borderTop:'1px solid #fef2f2' }}>
                    <td style={{ padding:'9px 14px', fontFamily:'monospace', fontWeight:600, color:'#dc2626' }}>{a.numero}</td>
                    <td style={{ padding:'9px 14px' }}>{a.responsable}</td>
                    <td style={{ padding:'9px 14px' }}>{a.estado}</td>
                    <td style={{ padding:'9px 14px', fontWeight:700, color:'#dc2626' }}>{a.horas.toFixed(1)} hs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionTitle>Por responsable</SectionTitle>
      <ResponsableTable rows={stats.porResponsable} totalActual={stats.resumen.totalActual} />

      <SectionTitle>Top 10 solicitantes</SectionTitle>
      <SolicitanteTable rows={stats.porEmisor.slice(0,10)} />

      <SectionTitle>Tickets por rango horario</SectionTitle>
      <RangosGrid rangos={stats.rangos} />

      <SectionTitle>Tickets por día de la semana</SectionTitle>
      <DiasGrid dias={stats.dias} />

      <SectionTitle>Tipos de resolución</SectionTitle>
      <TiposTable rows={stats.porTipoTicket} />
    </>
  )
}

// ── BBDD Área ──────────────────────────────────────────────────────────────
function BBDDAreaView({ area, stats }: { area:string; stats:AreaStats }) {
  const cfg = AREA_COLORS[area] || AREA_COLORS['OTRO']
  const abiertos = (stats.porEstado['Recibido']||0)+(stats.porEstado['Asignado']||0)+
    (stats.porEstado['Pendiente Operador']||0)+(stats.porEstado['Pendiente Ventas']||0)
  const resueltos = stats.porEstado['Resuelto']||0

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:4 }}>
        <StatCard label="Total tickets"  value={stats.total.toLocaleString()} color={cfg.header} />
        <StatCard label="Resueltos"      value={resueltos.toLocaleString()} color="#16a34a" />
        <StatCard label="Abiertos"       value={abiertos} color="#ea580c" />
        <StatCard label="Solicitantes"   value={stats.porSolicitante.length} color={cfg.header} />
      </div>

      <SectionTitle>Por estado</SectionTitle>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
        {Object.entries(stats.porEstado).sort((a,b)=>b[1]-a[1]).map(([estado,n])=>(
          <div key={estado} style={{ background:'white', border:'1px solid #f0f0f0', borderRadius:10, padding:'12px 18px', textAlign:'center', minWidth:120 }}>
            <p style={{ margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#111827' }}>{n}</p>
            <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>{estado}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Rangos horarios — {area}</SectionTitle>
      <RangosGrid rangos={stats.rangos} color={cfg.header} />

      <SectionTitle>Días de la semana — {area}</SectionTitle>
      <DiasGrid dias={stats.dias} color={cfg.header} />

      <SectionTitle>Por solicitante ({stats.porSolicitante.length})</SectionTitle>
      <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#f9fafb', borderBottom:'1px solid #f0f0f0' }}>
              {['Mail','Total','Resueltos','Abiertos','06-09','09-16','16-18','18+','Prom. hs'].map(h=>(
                <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#6b7280', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.porSolicitante.map((s,i)=>(
              <tr key={s.mail} style={{ borderTop:'1px solid #f9fafb', background:i%2===0?'white':'#fafafa' }}>
                <td style={{ padding:'8px 10px', color:'#374151', fontSize:12 }}>{s.mail}</td>
                <td style={{ padding:'8px 10px', textAlign:'center', fontWeight:700 }}>{s.total}</td>
                <td style={{ padding:'8px 10px', textAlign:'center', color:'#16a34a', fontWeight:600 }}>{s.resueltos}</td>
                <td style={{ padding:'8px 10px', textAlign:'center', color:s.abiertos>0?'#ea580c':'#9ca3af', fontWeight:600 }}>{s.abiertos||'—'}</td>
                {(s.rangos||[0,0,0,0]).map((n: number,ri: number)=>(
                  <td key={ri} style={{ padding:'8px 10px', textAlign:'center', color:n>0?cfg.header:'#d1d5db', fontWeight:n>0?600:400, fontSize:12 }}>{n||'—'}</td>
                ))}
                <td style={{ padding:'8px 10px', textAlign:'center', color:'#7c3aed', fontWeight:600 }}>
                  {s.promHoras>0?`${s.promHoras.toFixed(1)} hs`:'—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stats.porTipo.length > 0 && (
        <>
          <SectionTitle>Tipos de resolución — {area}</SectionTitle>
          <TiposTable rows={stats.porTipo} color={cfg.header} />
        </>
      )}
    </>
  )
}

// ── IT General ─────────────────────────────────────────────────────────────
function ITGeneralView({ stats }: { stats: GlobalStatsIT }) {
  return (
    <>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        <StatCard label="Total tickets"  value={stats.resumen.totalActual.toLocaleString()} color="#3730a3" />
        <StatCard label="Sin asignar"    value={stats.resumen.recibidosAhora}  color="#ea580c" />
        <StatCard label="Asignados"      value={stats.resumen.asignadosAhora}  color="#2563eb" />
        <StatCard label="Pendiente"      value={stats.resumen.pendientesAhora} color="#7c3aed" />
        <StatCard label="Resueltos"      value={stats.resumen.resueltosAhora.toLocaleString()} color="#16a34a" />
        <StatCard label="Prom. resolución" value={`${stats.resumen.promHoras.toFixed(1)} hs`} sub="horas hábiles" color="#0891b2" />
      </div>

      {/* Por sistema */}
      <SectionTitle>Tickets por sistema</SectionTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
        {stats.porSistema.map(s => {
          const cfg = SIS_COLORS[s.sistema] || SIS_COLORS['Otro']
          return (
            <div key={s.sistema} style={{ background:'white', border:'1px solid #f0f0f0', borderRadius:12, padding:'16px 18px' }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:cfg.header, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.sistema}</p>
              <p style={{ margin:'0 0 4px', fontSize:28, fontWeight:700, color:'#111827', lineHeight:1 }}>{s.total}</p>
              <div style={{ display:'flex', gap:12, marginTop:8 }}>
                <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>✓ {s.resueltos}</span>
                <span style={{ fontSize:12, color:'#ea580c', fontWeight:600 }}>⏳ {s.abiertos}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Atrasados */}
      {stats.atrasados.length > 0 && (
        <>
          <SectionTitle>⏰ Con +24 hs hábiles sin resolver ({stats.atrasados.length})</SectionTitle>
          <div style={{ background:'#fff', border:'1px solid #fecaca', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#fee2e2' }}>
                {['Ticket','Responsable','Estado','Hs hábiles'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#dc2626', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {stats.atrasados.map((a,i)=>(
                  <tr key={i} style={{ borderTop:'1px solid #fef2f2' }}>
                    <td style={{ padding:'9px 14px', fontFamily:'monospace', fontWeight:600, color:'#dc2626' }}>{a.numero}</td>
                    <td style={{ padding:'9px 14px' }}>{a.responsable}</td>
                    <td style={{ padding:'9px 14px' }}>{a.estado}</td>
                    <td style={{ padding:'9px 14px', fontWeight:700, color:'#dc2626' }}>{a.horas.toFixed(1)} hs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionTitle>Por responsable IT</SectionTitle>
      <ResponsableTable rows={stats.porResponsable} totalActual={stats.resumen.totalActual} />

      <SectionTitle>Top solicitantes IT</SectionTitle>
      <SolicitanteTable rows={stats.porSolicitante} />

      <SectionTitle>Tickets por rango horario</SectionTitle>
      <RangosGrid rangos={stats.rangos} color="#3730a3" />

      <SectionTitle>Tickets por día de la semana</SectionTitle>
      <DiasGrid dias={stats.dias} color="#3730a3" />
    </>
  )
}
