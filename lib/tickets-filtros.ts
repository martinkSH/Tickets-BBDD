import { ESTADOS_ORDEN } from './types'

// Filtros del listado de tickets. Se aplican en la consulta y no sobre la
// página cargada: si no, buscar un número o filtrar un estado sólo miraba los
// 100 tickets de la hoja actual.
export interface FiltrosTickets {
  q?: string
  estado?: string
  area?: string
  responsable?: string | null
}

const CAMPOS_BUSQUEDA = ['numero', 'mail_solicitante', 'proveedor', 'descripcion', 'responsable_nombre']

// Comas y paréntesis romperían la sintaxis del or() de PostgREST
const limpiar = (q?: string) => (q || '').replace(/[,()*]/g, ' ').trim()

export function filtrarTickets(query: any, f: FiltrosTickets, { conEstado = true } = {}) {
  if (f.responsable) query = query.eq('responsable_id', f.responsable)
  if (f.area) query = query.eq('area_afectada', f.area)
  if (conEstado && f.estado) query = query.eq('estado', f.estado)
  const q = limpiar(f.q)
  if (q) query = query.or(CAMPOS_BUSQUEDA.map(c => `${c}.ilike.*${q}*`).join(','))
  return query
}

// Conteo por estado con el resto de los filtros aplicados, para los chips.
// Un count por estado en vez de traer las filas: no choca con el tope de 1000.
export async function contarPorEstado(supabase: any, f: FiltrosTickets) {
  const res = await Promise.all(ESTADOS_ORDEN.map(e =>
    filtrarTickets(
      supabase.from('tickets_con_responsable').select('id', { count: 'exact', head: true }),
      f, { conEstado: false },
    ).eq('estado', e)
  ))
  const conteos: Record<string, number> = {}
  ESTADOS_ORDEN.forEach((e, i) => { conteos[e] = res[i].count || 0 })
  return conteos
}
