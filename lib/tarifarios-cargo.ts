// Filtro "Cargó" de la sección Tarifarios.
//
// `cargo_por` es texto libre y la misma persona aparece de varias formas
// ("Paula" y "Paula Masciangioli", "Jennifer" y "Jennifer Gutierrez"), así que
// se filtra por NOMBRE DE PILA: elegir "Paula" trae las dos variantes.

/** Valor del filtro para los que no tienen a nadie cargado. */
export const SIN_ASIGNAR = '__sin__'

/** El nombre de pila con que se agrupa: "Paula Masciangioli" → "Paula". */
export function nombreDePila(cargoPor: string | null | undefined): string {
  return (cargoPor ?? '').trim().split(/\s+/)[0] ?? ''
}

/**
 * Aplica el filtro a una query de Supabase. Matchea el nombre solo o seguido de
 * un apellido, así "Martin" no trae a una "Martina".
 */
export function filtrarPorCargo<Q extends { or: (f: string) => any }>(query: Q, cargo: string | undefined): Q {
  if (!cargo) return query
  if (cargo === SIN_ASIGNAR) return query.or('cargo_por.is.null,cargo_por.eq.')
  // Sólo letras (con tildes): el valor va adentro de un filtro de PostgREST.
  const n = cargo.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (!n) return query
  return query.or(`cargo_por.ilike.${n},cargo_por.ilike.${n} *`)
}
