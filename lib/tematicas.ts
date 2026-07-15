// Temáticas Especiales — vocabulario y armado de la nota para TourPlan.
//
// El objetivo es que desde /tematicas se pueda COPIAR el bloque y PEGARLO tal cual
// en la nota "Descripción Temática" (DP1..DP9) de la ficha del proveedor en TP. Por
// eso el formato de abajo tiene que respetar la plantilla de TP: mismos labels,
// mismo orden, línea en blanco entre campos.
//
// OJO: en TP el label va SIN tilde ("Tematica:"). No "corregirlo" — el módulo
// Temáticas Especiales de Atlas OPS parsea las notas por estos labels.

export const TEMATICAS = [
  'Horseback Riding',
  'Culinary',
  'Fly Fishing',
  'Kayak',
  'Biking Tour',
  'Avistaje de Aves',
  'Historico/Religioso',
  'Yoga, Wellnes & Retreats',
  'Mountain Bike',
  'Golf',
  'Enoturismo',
  'Tango',
  'Wildlife',
  'Automovilismo y Motos',
  'Turismo Comunitario',
  'Art Tours',
  'Sobrevuelos & Helicopteros',
  'Cruceros & Navegaciones',
] as const

export type Tematica = (typeof TEMATICAS)[number]

export type NotaTematica = {
  destino: string            // código TP (ej. 'MDZ')
  nombre_servicio?: string
  web_proveedor?: string
  descriptivo?: string
  comentarios?: string
  tarifa_aproximada?: string
  tematica: string
}

/**
 * Arma el texto de la nota con el formato exacto de la plantilla de TourPlan.
 * Los campos vacíos igual se incluyen (con el label solo), porque en TP la nota
 * se carga con todos los renglones y alguien puede completarlos después.
 */
export function buildNotaTP(n: NotaTematica): string {
  const v = (s?: string) => (s ?? '').trim()
  return [
    `Destino: ${v(n.destino)}`,
    `Nombre de Servicio: ${v(n.nombre_servicio)}`,
    `WEB del Proveedor: ${v(n.web_proveedor)}`,
    `Descriptivo: ${v(n.descriptivo)}`,
    `Comentarios: ${v(n.comentarios)}`,
    `Tarifa Aproximada: ${v(n.tarifa_aproximada)}`,
    `Tematica: ${v(n.tematica)}`,
  ].join('\n\n')
}
