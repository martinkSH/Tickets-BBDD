'use client'

// Temáticas Especiales — form de carga.
//
// Lo que se carga acá termina como nota "Descripción Temática" (DP1..DP9) en la
// ficha del proveedor en TourPlan, y de ahí lo lee el módulo Temáticas Especiales
// de Atlas OPS. Por eso los campos son exactamente los de la plantilla de TP y el
// form muestra abajo el bloque ya armado para copiar y pegar.
//
// Guarda en la tabla `tematicas_especiales` (ver supabase/tematicas_especiales.sql).
// No pasa por `tickets`: es una tabla propia, como alta-proveedor / alta-cliente.

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TEMATICAS, buildNotaTP } from '@/lib/tematicas'
import { DESTINOS_TP } from '@/lib/destinos-tp'
import MailAutocomplete from '@/components/MailAutocomplete'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

type Step = 'form' | 'success'

const Field = ({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className={labelCls}>{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
)

const blank = {
  mail_solicitante: '', proveedor: '', tematica: '', destino: '',
  nombre_servicio: '', web_proveedor: '', descriptivo: '', comentarios: '', tarifa_aproximada: '',
}

export default function TematicasEspecialesPage() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [form, setForm] = useState(blank)

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // El bloque que se pega en TP. Se arma en vivo para que se vea qué va a quedar.
  const nota = useMemo(() => buildNotaTP(form), [form])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(nota)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setError('No se pudo copiar automáticamente — seleccioná el texto y usá Ctrl+C.')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mail_solicitante || !form.proveedor || !form.tematica || !form.destino) {
      setError('Completá mail, proveedor, temática y destino.'); return
    }
    setError(''); setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.from('tematicas_especiales').insert({
      mail_solicitante: form.mail_solicitante.trim(),
      proveedor: form.proveedor.trim(),
      tematica: form.tematica,
      destino: form.destino,
      nombre_servicio: form.nombre_servicio.trim() || null,
      web_proveedor: form.web_proveedor.trim() || null,
      descriptivo: form.descriptivo.trim() || null,
      comentarios: form.comentarios.trim() || null,
      tarifa_aproximada: form.tarifa_aproximada.trim() || null,
    })
    setLoading(false)
    if (err) { setError('Error al guardar: ' + err.message); return }
    setStep('success')
  }

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Temática cargada!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Queda pendiente de cargarse en TourPlan. Una vez cargada, aparece en el módulo
          Temáticas Especiales de Atlas OPS.
        </p>
        <button onClick={() => { setStep('form'); setForm({ ...blank, mail_solicitante: form.mail_solicitante }) }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Cargar otra temática
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl">🎯</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Say Hueque</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Temáticas Especiales</h1>
          <p className="text-slate-500 text-sm">
            Cargá un servicio temático de un proveedor. Se carga como nota en TourPlan y de ahí lo toma Atlas OPS.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-5">

          <Field label="Tu mail" req>
            <MailAutocomplete required value={form.mail_solicitante}
              onChange={v => setForm(f => ({ ...f, mail_solicitante: v }))}
              placeholder="nombre@sayhueque.com" />
          </Field>

          <Field label="Proveedor" req hint="A quién hay que cargarle la nota en TourPlan.">
            <input value={form.proveedor} onChange={set('proveedor')} className={inputCls}
              placeholder="Ej: Argentina Extrema" />
          </Field>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 mt-4">
              Datos de la nota (formato TourPlan)
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Destino" req hint="Se graba el código (ej. MDZ).">
                  <select value={form.destino} onChange={set('destino')} className={inputCls}>
                    <option value="">Seleccionar…</option>
                    {DESTINOS_TP.map(d => (
                      <option key={d.code} value={d.code}>{d.nombre} ({d.code})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Temática" req>
                  <select value={form.tematica} onChange={set('tematica')} className={inputCls}>
                    <option value="">Seleccionar…</option>
                    {TEMATICAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Nombre de Servicio">
                <input value={form.nombre_servicio} onChange={set('nombre_servicio')} className={inputCls}
                  placeholder="Ej: Cabalgata Cruce de los Andes" />
              </Field>

              <Field label="WEB del Proveedor">
                <input value={form.web_proveedor} onChange={set('web_proveedor')} className={inputCls}
                  placeholder="https://…" />
              </Field>

              <Field label="Descriptivo">
                <textarea value={form.descriptivo} onChange={set('descriptivo')} className={inputCls} rows={3}
                  placeholder="Descripción del servicio…" />
              </Field>

              <Field label="Comentarios">
                <textarea value={form.comentarios} onChange={set('comentarios')} className={inputCls} rows={4}
                  placeholder="Detalles, condiciones, nivel de experiencia requerido…" />
              </Field>

              <Field label="Tarifa Aproximada">
                <input value={form.tarifa_aproximada} onChange={set('tarifa_aproximada')} className={inputCls}
                  placeholder="Ej: USD 250 por pax" />
              </Field>
            </div>
          </div>

          {/* Bloque listo para pegar en la nota de TP */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2 mt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Para copiar y pegar en TourPlan
              </h3>
              <button type="button" onClick={copiar}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
            <textarea readOnly value={nota} rows={15}
              onFocus={e => e.currentTarget.select()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono bg-slate-50 text-slate-700 resize-none" />
            <p className="text-xs text-slate-400 mt-1">
              Este es el texto exacto de la nota. Se actualiza mientras completás el form.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all text-sm"
            style={{ background: loading ? '#94a3b8' : '#e8573f', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Enviando…' : 'Enviar temática →'}
          </button>
        </form>
      </div>
    </div>
  )
}
