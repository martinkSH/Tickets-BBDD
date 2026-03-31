'use client'
import { useState } from 'react'

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5"

function Field({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function AltaClientePage() {
  const [step, setStep] = useState<'form'|'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoFile, setLogoFile] = useState<File|null>(null)
  const [form, setForm] = useState({
    mail_contacto: '', tipo_cliente: '' as ''|'Madre'|'Consumidor Final',
    nombre_madre: '', nombre_fantasia: '', direccion: '',
    razon_social: '', nombre_contacto: '', mail_telefono: '',
    contacto_interno: '', sitio_web: '', categoria: '' as ''|'A'|'B'|'C'|'D',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mail_contacto || !form.tipo_cliente || !form.nombre_fantasia || !form.razon_social || !form.nombre_contacto || !form.categoria) {
      setError('Por favor completá todos los campos obligatorios.'); return
    }
    if (form.tipo_cliente === 'Consumidor Final' && !form.nombre_madre) {
      setError('Para Consumidor Final es necesario indicar el Cliente Madre.'); return
    }
    setLoading(true); setError('')

    // Upload logo si hay
    let logo_url = ''
    if (logoFile) {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const ext = logoFile.name.split('.').pop()
      const path = `clientes-logos/${Date.now()}.${ext}`
      const { error: upErr } = await sb.storage.from('adjuntos').upload(path, logoFile, { upsert: false })
      if (!upErr) {
        const { data: urlData } = sb.storage.from('adjuntos').getPublicUrl(path)
        logo_url = urlData.publicUrl
      }
    }

    const res = await fetch('/api/clientes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, logo_url }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error||'Error al enviar'); setLoading(false); return }
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
        <p className="text-slate-500 text-sm">Recibimos tu solicitud de alta. Nuestro equipo la revisará y procesará a la brevedad.</p>
        <p className="text-slate-400 text-xs mt-4">Say Hueque · Atlas Archive</p>
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
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Say Hueque</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Alta de Cliente</h1>
          <p className="text-slate-400 text-xs mt-3 max-w-md mx-auto">Completá el formulario para dar de alta un nuevo cliente en el sistema.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">

          {/* Tipo */}
          <Section title="📋 Tipo de cliente">
            <div className="md:col-span-2">
              <Field label="Tipo de cliente a cargar" req hint="Si es un cliente nuevo seleccioná Madre. Para crear un consumidor final de un cliente madre existente, seleccioná Consumidor Final.">
                <div className="flex gap-4 mt-1">
                  {(['Madre','Consumidor Final'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipo" value={t} checked={form.tipo_cliente===t} onChange={set('tipo_cliente')}
                        className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-slate-700">{t}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            {form.tipo_cliente === 'Consumidor Final' && (
              <div className="md:col-span-2">
                <Field label="Nombre del Cliente Madre" req>
                  <input value={form.nombre_madre} onChange={set('nombre_madre')} className={inputCls} placeholder="Nombre del cliente madre existente" />
                </Field>
              </div>
            )}
          </Section>

          {/* Datos empresa */}
          <Section title="🏢 Datos de la empresa">
            <div className="md:col-span-2">
              <Field label="Razón Social" req>
                <input value={form.razon_social} onChange={set('razon_social')} className={inputCls} placeholder="Razón social completa" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Nombre de Fantasía" req hint="Respetar mayúsculas y minúsculas">
                <input value={form.nombre_fantasia} onChange={set('nombre_fantasia')} className={inputCls} placeholder="Nombre de fantasía" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Dirección" hint="Calle / Altura / Localidad / Ciudad / País / Código Postal">
                <input value={form.direccion} onChange={set('direccion')} className={inputCls} placeholder="Dirección completa" />
              </Field>
            </div>
            <Field label="Sitio Web">
              <input value={form.sitio_web} onChange={set('sitio_web')} className={inputCls} placeholder="https://www.empresa.com" />
            </Field>
            <Field label="Logo de la empresa" hint="Formato PNG">
              <input type="file" accept="image/png,image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) setLogoFile(f) }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-600" />
              {logoFile && <p className="text-xs text-emerald-600 mt-1">✓ {logoFile.name}</p>}
            </Field>
          </Section>

          {/* Contacto */}
          <Section title="👤 Datos de contacto">
            <Field label="Mail solicitante" req>
              <input type="email" value={form.mail_contacto} onChange={set('mail_contacto')} className={inputCls} placeholder="tu@empresa.com" />
            </Field>
            <Field label="Nombre de contacto" req>
              <input value={form.nombre_contacto} onChange={set('nombre_contacto')} className={inputCls} placeholder="Nombre completo" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Mail / Teléfono de contacto" req>
                <input value={form.mail_telefono} onChange={set('mail_telefono')} className={inputCls} placeholder="Mail o teléfono del contacto" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Contacto interno Say Hueque" hint="Mail o nombre de la persona dentro de la empresa con quien se tuvo contacto">
                <input value={form.contacto_interno} onChange={set('contacto_interno')} className={inputCls} placeholder="Nombre o mail del contacto interno" />
              </Field>
            </div>
          </Section>

          {/* Categoría */}
          <Section title="⭐ Categoría">
            <div className="md:col-span-2">
              <Field label="Categoría del cliente" req hint="La categoría afecta el mark-up aplicado. Si no se conoce, consultar con el referente de tu sector.">
                <div className="flex gap-4 mt-1 flex-wrap">
                  {(['A','B','C','D'] as const).map(cat => {
                    const colors: Record<string,string> = { A:'#16a34a', B:'#2563eb', C:'#d97706', D:'#dc2626' }
                    const active = form.categoria === cat
                    return (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="categoria" value={cat} checked={active} onChange={set('categoria')} className="w-4 h-4" />
                        <span style={{ fontWeight: active ? 700 : 500, color: active ? colors[cat] : '#374151', fontSize: 14 }}>
                          Categoría {cat}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </Field>
            </div>
          </Section>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all shadow-sm"
            style={{ background: loading ? '#94a3b8' : '#e8573f' }}>
            {loading ? 'Enviando…' : 'Enviar solicitud de alta →'}
          </button>
        </form>
      </div>
    </div>
  )
}
