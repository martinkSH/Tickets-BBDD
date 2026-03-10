export type Rol = 'admin' | 'responsable'
export type Estado = 'Recibido' | 'Asignado' | 'Resuelto'
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
  // join
  responsable_nombre?: string
  responsable_mail?: string
}

export const ESTADO_CONFIG: Record<Estado, {
  label: string; bg: string; text: string; border: string; dot: string; next?: Estado
}> = {
  Recibido: {
    label: 'Recibido',
    bg: 'bg-slate-100', text: 'text-slate-700',
    border: 'border-slate-300', dot: 'bg-slate-400',
    next: 'Asignado',
  },
  Asignado: {
    label: 'Asignado',
    bg: 'bg-amber-50', text: 'text-amber-800',
    border: 'border-amber-300', dot: 'bg-amber-500',
    next: 'Resuelto',
  },
  Resuelto: {
    label: 'Resuelto',
    bg: 'bg-emerald-50', text: 'text-emerald-800',
    border: 'border-emerald-300', dot: 'bg-emerald-500',
  },
}

export const AREA_CONFIG: Record<string, { badge: string; short: string }> = {
  'Tarifas':       { badge: 'bg-violet-100 text-violet-800', short: 'TF' },
  'Base de Datos': { badge: 'bg-blue-100 text-blue-800',     short: 'BD' },
  'Otro':          { badge: 'bg-gray-100 text-gray-600',     short: 'OT' },
}

export const MOTIVOS_TARIFAS = [
  'Carga de nueva tarifa en IT o TP',
  'Modificación de tarifa existente',
  'Eliminación de tarifa',
  'Consulta de tarifa',
  'Otros',
]

export const MOTIVOS_BD = [
  'Alta de nuevos servicios',
  'Modificación de servicios existentes',
  'Información de servicios incompleta',
  'Baja de servicios',
  'Otros',
]

export const TIPOS_TICKET = [
  'Error del Usuario',
  'Pedido de Alta Tarifa',
  'Pedido de Alta Operador / Cliente',
  'Error del Área',
  'Error del Sistema',
  'Pedido de Alta SVC/HTL',
  'Consulta',
  'Pedido de Alta Paquete',
  'Actualización de Descriptivos',
] as const

export function buildResumen(proveedor?: string, ciudad?: string, tipo?: string, fechas?: string) {
  return [
    proveedor && `Proveedor: ${proveedor}`,
    ciudad    && `Ciudad: ${ciudad}`,
    tipo      && `Tipo: ${tipo}`,
    fechas    && `Fechas: ${fechas}`,
  ].filter(Boolean).join(' / ')
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
