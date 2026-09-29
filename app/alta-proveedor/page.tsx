'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SERVICIOS = [
  'Aéreos',
  'Alojamiento',
  'Excursiones',
  'Guía',
  'No turístico',
  'Restaurant',
  'Servicios Varios',
  'Tour-Operator',
  'Traslados',
  'Viandas',
]

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls = "block text-sm font-medium text-slate-700 mb-1"

type Step = 'form' | 'success'

const FORM_VACIO = {
  razon_social: '', nombre_fantasia: '', cuit: '',
  condicion_impositiva: '', mail_contacto: '', telefono: '',
  domicilio: '', domicilio_facturacion: '', ciudad: '', pais: 'Argentina',
  forma_pago: '', moneda_pago: '', termino_pago: '',
  cbu: '', alias_cbu: '', banco: '', datos_bancarios: '',
  contacto_pagos: '', mail_pagos: '', contacto_reservas: '', mail_reservas: '',
  contacto_admin: '', contacto_comercial: '',
  telefono_emergencias: '', comentario: '',
}

// Los datos bancarios obligatorios dependen de si el proveedor opera en
// Argentina (CUIT + CBU/alias) o en el exterior (tax ID + datos libres).
const esArgentina = (pais: string) =>
  pais.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'argentina'

// ⬇️ Helpers MOVIDOS FUERA del componente principal.
// Si quedan dentro, se redefinen en cada render → React los ve como
// componentes nuevos → desmonta y remonta el subárbol → el input
// pierde el foco con cada tecla. Este era el bug.
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100">{title}</h3>
    {children}
  </div>
)

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">{children}</div>
)

const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
  <div>
    <label className={labelCls}>{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
    {children}
  </div>
)

export default function AltaProveedorPage() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [servicios, setServicios] = useState<string[]>([])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleServicio = (s: string) =>
    setServicios(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const local = esArgentina(form.pais)

  const handleSubmit = async () => {
    if (!form.nombre_fantasia.trim() || !form.razon_social.trim() || !form.mail_contacto.trim()) {
      setError('Completá nombre de fantasía, razón social y mail de contacto.'); return
    }
    if (servicios.length === 0) {
      setError('Seleccioná al menos un tipo de servicio.'); return
    }
    if (local) {
      if (!form.cuit.trim()) { setError('Completá el CUIT.'); return }
      const cbu = form.cbu.replace(/\D/g, '')
      if (!cbu && !form.alias_cbu.trim()) { setError('Completá el CBU o el alias.'); return }
      if (cbu && cbu.length !== 22) { setError('El CBU tiene que tener 22 dígitos.'); return }
    } else {
      if (!form.cuit.trim()) { setError('Completá la identificación fiscal (Tax ID).'); return }
      if (!form.datos_bancarios.trim()) { setError('Completá los datos bancarios.'); return }
    }
    setError(''); setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.from('proveedores').insert({ ...form, cbu: form.cbu.replace(/\D/g, ''), servicios })
    setLoading(false)
    if (err) { setError('Error al guardar: ' + err.message); return }
    setStep('success')
  }

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Alta registrada!</h2>
        <p className="text-slate-500 text-sm mb-6">Tu solicitud de alta como proveedor fue enviada correctamente. Nos contactaremos a la brevedad.</p>
        <button onClick={() => { setStep('form'); setForm(FORM_VACIO); setServicios([]) }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Registrar otro proveedor
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg border border-amber-500 flex items-center justify-center">
              <span className="text-xs font-black text-amber-600">A</span>
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Atlas Archive</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Alta de Proveedor</h1>
          <p className="text-slate-500 text-sm">Completá el formulario para registrarte como proveedor de Say Hueque</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          {/* ── TIPOS DE SERVICIO ── */}
          <Section title="Tipo de servicios que brindás">
            <p className="text-sm text-slate-500 mb-4">Seleccioná todos los que correspondan <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {SERVICIOS.map(s => {
                const sel = servicios.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleServicio(s)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left"
                    style={{
                      borderColor: sel ? '#3b82f6' : '#e2e8f0',
                      background: sel ? '#eff6ff' : 'white',
                      color: sel ? '#1d4ed8' : '#475569',
                    }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, border: '2px solid',
                      borderColor: sel ? '#3b82f6' : '#cbd5e1',
                      background: sel ? '#3b82f6' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    {s}
                  </button>
                )
              })}
            </div>
            {servicios.length > 0 && (
              <p className="text-xs text-blue-600 mt-3 font-medium">
                Seleccionados: {servicios.join(', ')}
              </p>
            )}
          </Section>

          {/* ── DATOS GENERALES ── */}
          <Section title="Datos generales">
            <Row>
              <Field label="Nombre de fantasía" req><input value={form.nombre_fantasia} onChange={set('nombre_fantasia')} className={inputCls} placeholder="Nombre comercial" /></Field>
              <Field label="Razón social" req><input value={form.razon_social} onChange={set('razon_social')} className={inputCls} placeholder="Empresa S.A." /></Field>
            </Row>
            <Row>
              <Field label="Mail de contacto" req><input type="email" value={form.mail_contacto} onChange={set('mail_contacto')} className={inputCls} placeholder="contacto@empresa.com" /></Field>
              <Field label="Teléfono"><input value={form.telefono} onChange={set('telefono')} className={inputCls} placeholder="+54 9 11 1234-5678" /></Field>
            </Row>
            <Row>
              <Field label="Ciudad"><input value={form.ciudad} onChange={set('ciudad')} className={inputCls} placeholder="Buenos Aires" /></Field>
              <Field label="País"><input value={form.pais} onChange={set('pais')} className={inputCls} /></Field>
            </Row>
          </Section>

          {/* ── DIRECCIONES ── */}
          <Section title="Direcciones">
            <Row>
              <Field label="Dirección física"><input value={form.domicilio} onChange={set('domicilio')} className={inputCls} placeholder="Donde se presta el servicio" /></Field>
              <Field label="Dirección de facturación"><input value={form.domicilio_facturacion} onChange={set('domicilio_facturacion')} className={inputCls} placeholder="Domicilio fiscal" /></Field>
            </Row>
          </Section>

          {/* ── DATOS BANCARIOS ── */}
          <Section title="Datos bancarios">
            {local ? (
              <>
                <Row>
                  <Field label="CUIT" req><input value={form.cuit} onChange={set('cuit')} className={inputCls} placeholder="20-12345678-9" /></Field>
                  <Field label="Condición impositiva">
                    <select value={form.condicion_impositiva} onChange={set('condicion_impositiva')} className={inputCls}>
                      <option value="">Seleccionar…</option>
                      {['Responsable Inscripto','Monotributista','Exento','Consumidor Final','No responsable'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                </Row>
                <Row>
                  <Field label="CBU" req><input value={form.cbu} onChange={set('cbu')} className={inputCls} placeholder="22 dígitos" inputMode="numeric" /></Field>
                  <Field label="Alias"><input value={form.alias_cbu} onChange={set('alias_cbu')} className={inputCls} placeholder="mi.alias.banco" /></Field>
                </Row>
                <p className="text-xs text-slate-400 -mt-2 mb-4">Con CBU o alias alcanza.</p>
                <Row>
                  <Field label="Banco"><input value={form.banco} onChange={set('banco')} className={inputCls} placeholder="Banco Nación" /></Field>
                  <Field label="Otros datos bancarios"><input value={form.datos_bancarios} onChange={set('datos_bancarios')} className={inputCls} placeholder="Tipo y número de cuenta, sucursal…" /></Field>
                </Row>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">Proveedor del exterior: indicá tu identificación fiscal y los datos para transferencias internacionales.</p>
                <Row>
                  <Field label="Identificación fiscal (Tax ID / VAT / RUT)" req><input value={form.cuit} onChange={set('cuit')} className={inputCls} /></Field>
                  <Field label="Banco"><input value={form.banco} onChange={set('banco')} className={inputCls} /></Field>
                </Row>
                <Field label="Datos bancarios" req>
                  <textarea value={form.datos_bancarios} onChange={set('datos_bancarios')} className={inputCls} rows={4} placeholder="Beneficiario, número de cuenta / IBAN, SWIFT / BIC, dirección del banco, banco intermediario…" />
                </Field>
              </>
            )}
          </Section>

          {/* ── CONDICIONES DE PAGO ── */}
          <Section title="Condiciones de pago">
            <Row>
              <Field label="Forma de pago">
                <select value={form.forma_pago} onChange={set('forma_pago')} className={inputCls}>
                  <option value="">Seleccionar…</option>
                  {['Transferencia bancaria','Cheque','Efectivo','Tarjeta de crédito','Western Union'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Moneda">
                <select value={form.moneda_pago} onChange={set('moneda_pago')} className={inputCls}>
                  <option value="">Seleccionar…</option>
                  {['ARS','USD','EUR'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </Row>
            <Field label="Término de pago"><input value={form.termino_pago} onChange={set('termino_pago')} className={inputCls} placeholder="30 días, anticipado, etc." /></Field>
          </Section>

          {/* ── CONTACTOS ── */}
          <Section title="Contactos">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Pagos</p>
            <Row>
              <Field label="Nombre"><input value={form.contacto_pagos} onChange={set('contacto_pagos')} className={inputCls} placeholder="Nombre y apellido" /></Field>
              <Field label="Mail"><input type="email" value={form.mail_pagos} onChange={set('mail_pagos')} className={inputCls} placeholder="pagos@empresa.com" /></Field>
            </Row>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Reservas</p>
            <Row>
              <Field label="Nombre"><input value={form.contacto_reservas} onChange={set('contacto_reservas')} className={inputCls} placeholder="Nombre y apellido" /></Field>
              <Field label="Mail"><input type="email" value={form.mail_reservas} onChange={set('mail_reservas')} className={inputCls} placeholder="reservas@empresa.com" /></Field>
            </Row>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Otros</p>
            <Row>
              <Field label="Contacto administrativo"><input value={form.contacto_admin} onChange={set('contacto_admin')} className={inputCls} placeholder="Nombre y teléfono" /></Field>
              <Field label="Contacto comercial"><input value={form.contacto_comercial} onChange={set('contacto_comercial')} className={inputCls} placeholder="Nombre y teléfono" /></Field>
            </Row>
            <Row>
              <Field label="Teléfono de emergencias"><input value={form.telefono_emergencias} onChange={set('telefono_emergencias')} className={inputCls} placeholder="+54 9 11..." /></Field>
              <div />
            </Row>
          </Section>

          {/* ── COMENTARIOS ── */}
          <Section title="Información adicional">
            <Field label="Comentarios u observaciones">
              <textarea value={form.comentario} onChange={set('comentario')} className={inputCls} rows={4} placeholder="Cualquier información adicional relevante…" />
            </Field>
          </Section>

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all text-sm"
            style={{ background: loading ? '#94a3b8' : '#e8573f', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Enviando…' : 'Enviar formulario de alta →'}
          </button>
        </div>
      </div>
    </div>
  )
}
