'use client'

import { useState } from 'react'

type Step = 'form' | 'success'

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5"

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
      {children}
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-1">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mb-4">{sub}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function AltaProveedorPage() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    mail_contacto: '', razon_social: '', nombre_fantasia: '',
    domicilio: '', ciudad: '', pais: '', telefono: '',
    cuit: '', condicion_impositiva: '',
    forma_pago: '', moneda_pago: '', termino_pago: '', datos_bancarios: '', mail_pagos: '',
    contacto_admin: '', contacto_comercial: '', contacto_reservas: '', telefono_emergencias: '',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mail_contacto || !form.razon_social || !form.nombre_fantasia || !form.ciudad || !form.pais || !form.telefono || !form.contacto_admin) {
      setError('Por favor completá todos los campos obligatorios.'); return
    }
    setLoading(true); setError('')
    const res = await fetch('/api/proveedores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al enviar'); setLoading(false); return }
    setStep('success')
    setLoading(false)
  }

  if (step === 'success') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Solicitud enviada!</h1>
        <p className="text-slate-500 text-sm">Recibimos tu solicitud de alta. Nuestro equipo la revisará y te contactará a la brevedad.</p>
        <p className="text-slate-400 text-xs mt-4">Say Hueque · Argentina & Chile Journeys</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#c9a96e' }}>A</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#c9a96e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Atlas</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Archive</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em' }}>Say Hueque</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Alta de Proveedor</h1>
          <p className="text-slate-500 text-sm mt-1">Supplier Registration</p>
          <p className="text-slate-400 text-xs mt-3 max-w-md mx-auto">
            Completá el formulario para darte de alta como proveedor de Say Hueque, o actualizar tu información si ya trabajamos juntos.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {/* Contacto */}
          <Section title="📧 Datos de contacto" sub="Contact information">
            <Field label="Mail / Email" req>
              <input type="email" value={form.mail_contacto} onChange={set('mail_contacto')} className={inputCls} placeholder="proveedor@email.com" />
            </Field>
            <Field label="Teléfono / Telephone" req>
              <input value={form.telefono} onChange={set('telefono')} className={inputCls} placeholder="+54 11 1234-5678" />
            </Field>
          </Section>

          {/* Empresa */}
          <Section title="🏢 Datos de la empresa" sub="Company information">
            <div className="md:col-span-2">
              <Field label="Razón Social (debe coincidir con la factura) / Legal Business Name" req>
                <input value={form.razon_social} onChange={set('razon_social')} className={inputCls} placeholder="Razón social completa" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Nombre de Fantasía / Fantasy Name" req>
                <input value={form.nombre_fantasia} onChange={set('nombre_fantasia')} className={inputCls} placeholder="Si coincide con Razón Social, repetir" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Domicilio real y fiscal / Real and Billing Address">
                <input value={form.domicilio} onChange={set('domicilio')} className={inputCls} placeholder="Calle, altura, piso, depto, código postal" />
              </Field>
            </div>
            <Field label="Ciudad / City" req>
              <input value={form.ciudad} onChange={set('ciudad')} className={inputCls} placeholder="Nombre completo de la ciudad" />
            </Field>
            <Field label="País / Country (código ISO)" req>
              <input value={form.pais} onChange={set('pais')} className={inputCls} placeholder="AR, CL, BR, UY…" maxLength={2} />
            </Field>
          </Section>

          {/* Fiscal */}
          <Section title="🧾 Datos fiscales" sub="Tax information (Argentina only)">
            <Field label="CUIT (solo proveedores argentinos)">
              <input value={form.cuit} onChange={set('cuit')} className={inputCls} placeholder="Sin espacios ni guiones" />
            </Field>
            <Field label="Condición impositiva / Tax Status">
              <select value={form.condicion_impositiva} onChange={set('condicion_impositiva')} className={inputCls}>
                <option value="">Seleccioná…</option>
                <option>Responsable inscripto</option>
                <option>Monotributista</option>
                <option>Exento</option>
                <option>No Responsable</option>
              </select>
            </Field>
          </Section>

          {/* Pago */}
          <Section title="💳 Datos de pago" sub="Payment information">
            <Field label="Forma de pago / Payment method" req>
              <select value={form.forma_pago} onChange={set('forma_pago')} className={inputCls}>
                <option value="">Seleccioná…</option>
                <option>Cuenta Corriente</option>
                <option>Prepago (pago por adelantado)</option>
              </select>
            </Field>
            <Field label="Moneda de pago / Payment currency" req>
              <select value={form.moneda_pago} onChange={set('moneda_pago')} className={inputCls}>
                <option value="">Seleccioná…</option>
                {['USD BNA','USD MEP','ARS','CLP','BRL','EUR'].map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Término de pago / Payment terms" req>
                <input value={form.termino_pago} onChange={set('termino_pago')} className={inputCls} placeholder="Cantidad de días pre/post servicio. Aclarar señas si aplica." />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Datos bancarios / Banking details" req>
                <textarea value={form.datos_bancarios} onChange={set('datos_bancarios')} className={inputCls} rows={3}
                  placeholder="Nombre del Banco / CBU / Nro de cuenta / Nombre del titular — SOLO CBU, no cuentas digitales ni alias" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Mail para informar pagos / Email for payment notifications" req>
                <input type="email" value={form.mail_pagos} onChange={set('mail_pagos')} className={inputCls} placeholder="pagos@proveedor.com" />
              </Field>
            </div>
          </Section>

          {/* Contactos */}
          <Section title="👥 Contactos" sub="Key contacts">
            <div className="md:col-span-2">
              <Field label="Contacto Administración / Administration Contact" req>
                <input value={form.contacto_admin} onChange={set('contacto_admin')} className={inputCls} placeholder="Nombre completo, Email, Teléfono" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Contacto Comercial / Commercial Contact">
                <input value={form.contacto_comercial} onChange={set('contacto_comercial')} className={inputCls} placeholder="Nombre completo, Email, Teléfono" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Reservas / Reservations">
                <input value={form.contacto_reservas} onChange={set('contacto_reservas')} className={inputCls} placeholder="Nombre completo, Email, Teléfono" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Teléfono de guardia/emergencias / Emergency phone">
                <input value={form.telefono_emergencias} onChange={set('telefono_emergencias')} className={inputCls} placeholder="+54 11 9999-9999" />
              </Field>
            </div>
          </Section>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm">
            {loading ? 'Enviando…' : 'Enviar solicitud de alta'}
          </button>

          <p className="text-center text-xs text-slate-400 pb-4">
            Consultas: <a href="mailto:lupe@sayhueque.com" className="text-blue-500">lupe@sayhueque.com</a>
          </p>
        </form>
      </div>
    </div>
  )
}
