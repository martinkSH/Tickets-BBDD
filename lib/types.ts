export type Rol = 'admin' | 'responsable'
export type Estado =
  | 'Recibido'
  | 'Asignado'
  | 'Pendiente Operador'
  | 'Pendiente Ventas'
  | 'Pendiente Conformidad'
  | 'Resuelto'

// Quién cerró el ticket. 'legacy' son los cerrados antes de existir la conformidad.
export type CerradoPor = 'solicitante' | 'auto' | 'bbdd' | 'legacy'

export type AreaAfectada = 'Tarifas' | 'Base de Datos' | 'Otro'

export interface Perfil {
  id: string
  nombre: string
  mail: string
  rol: Rol
  activo: boolean
  created_at: string
}

export interface Ticket {
  id: string
  numero: string
  created_at: string
  mail_solicitante: string
  area_afectada: AreaAfectada
  motivo_tarifas?: string
  motivo_bd?: string
  proveedor?: string
  ciudad?: string
  tipo_servicio?: string
  fechas_servicio?: string
  descripcion: string
  imagen_url?: string
  resumen_servicio?: string
  responsable_id?: string
  comentario_asignacion?: string
  comentario_solucion?: string
  tipo_ticket?: string
  estado: Estado
  assigned_at?: string
  fecha_resolucion?: string
  responsable_nombre?: string
  responsable_mail?: string
  // Ciclo de conformidad del solicitante
  token_publico?: string
  fecha_cierre?: string
  cerrado_por?: CerradoPor
  conformidad_pedida_at?: string
  recordatorio_enviado_at?: string
}

export interface TicketComentario {
  id: string
  ticket_id: string
  autor_tipo: 'solicitante' | 'responsable'
  autor_mail?: string
  autor_id?: string
  contenido: string
  created_at: string
}

// Horas hábiles que el solicitante tiene para responder antes del cierre automático
export const HORAS_CONFORMIDAD = 72
// A mitad de camino se le manda un recordatorio
export const HORAS_RECORDATORIO = 36

export const ESTADOS_PAUSA: Estado[] = ['Pendiente Operador', 'Pendiente Ventas']

export const ESTADOS_ORDEN: Estado[] = [
  'Recibido', 'Asignado', 'Pendiente Operador', 'Pendiente Ventas',
  'Pendiente Conformidad', 'Resuelto',
]

// Estados en los que BBDD ya terminó su trabajo (fecha_resolucion cargada).
// Ojo: 'resuelto' ≠ 'cerrado'. Cerrado es sólo 'Resuelto'.
export const ESTADOS_RESUELTOS: Estado[] = ['Pendiente Conformidad', 'Resuelto']

export const ESTADO_CONFIG: Record<Estado, {
  label: string; color: string; bg: string; border: string; dot: string; pausa: boolean
}> = {
  'Recibido':          { label: 'Recibido',       color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-200',  dot: 'bg-slate-400',  pausa: false },
  'Asignado':          { label: 'Asignado',        color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300', dot: 'bg-orange-500', pausa: false },
  'Pendiente Operador':{ label: 'Pend. Operador',  color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-400', pausa: true  },
  'Pendiente Ventas':  { label: 'Pend. Ventas',    color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-400', pausa: true  },
  'Pendiente Conformidad': { label: 'Esperando al solicitante', color: 'text-cyan-800', bg: 'bg-cyan-50', border: 'border-cyan-300', dot: 'bg-cyan-500', pausa: true },
  'Resuelto':          { label: 'Cerrado',         color: 'text-emerald-800',bg: 'bg-emerald-100',border: 'border-emerald-300',dot: 'bg-emerald-600',pausa: false },
}

export const AREA_CONFIG: Record<string, { badge: string; short: string }> = {
  'Tarifas':       { badge: 'bg-violet-100 text-violet-700', short: 'TF' },
  'Base de Datos': { badge: 'bg-sky-100 text-sky-700',       short: 'BD' },
  'Otro':          { badge: 'bg-gray-100 text-gray-600',     short: 'OT' },
}

export const MOTIVOS_TARIFAS = [
  'Carga de nueva tarifa en IT o TP','Modificación de tarifa existente',
  'Eliminación de tarifa','Consulta de tarifa','Otros',
]

export const MOTIVOS_BD = [
  'Alta de nuevos servicios','Modificación de servicios existentes',
  'Información de servicios incompleta','Baja de servicios','Otros',
]

export const TIPOS_TICKET = [
  'Error del Usuario','Pedido de Alta Tarifa','Pedido de Alta Operador / Cliente',
  'Error del Área','Error del Sistema','Pedido de Alta SVC/HTL',
  'Consulta','Pedido de Alta Paquete','Actualización de Descriptivos',
] as const

export function buildResumen(p?: string, c?: string, t?: string, f?: string) {
  return [p && `Prov: ${p}`, c && `Ciudad: ${c}`, t && `Tipo: ${t}`, f && `Fechas: ${f}`]
    .filter(Boolean).join(' · ')
}

export function formatFecha(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(' ')
}
