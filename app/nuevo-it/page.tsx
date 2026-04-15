'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

type Sistema = 'Tourplan' | 'Pythagoras/Bazar' | 'Backend B2C' | 'Vamoos' | 'Otro' | ''
type ModuloTP = 'COTIZ.PCM' | 'FITS' | 'GRUPOS' | 'CLIENTES' | 'PROVEEDORES' | 'CONFIG. DE PRODUCTO' | 'OTRO' | ''

function Field({ label, req, hint, children, span2 }: { label: string; req?: boolean; hint?: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

export default function NuevoTicketITPage() {
  const [step, setStep] = useState<'form'|'success'>('form')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    mail_solicitante: '', sistema: '' as Sistema,
    // Tourplan
    modulo_tourplan: '' as ModuloTP,
    codigo_file: '', nro_voucher: '',
    codigo_cliente_proveedor: '', codigo_producto: '',
    // Pythagoras
    modulo_pythagoras: '', codigo_file_tourplan: '', codigo_file_pythagoras: '',
    // B2C
    modulo_b2c: '', link_itinerario: '',
    // Todos
    descripcion: '', imagen_url: '',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Paste imagen
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) setFile(new File([blob], `captura-${Date.now()}.png`, { type: blob.type }))
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const moduloTPesPCMFITS = ['COTIZ.PCM','FITS','GRUPOS'].includes(form.modulo_tourplan)
  const moduloTPesOtros = ['CLIENTES','PROVEEDORES','CONFIG. DE PRODUCTO'].includes(form.modulo_tourplan)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mail_solicitante || !form.sistema || !form.descripcion) {
      setError('Completá los campos obligatorios.'); return
    }
    setLoading(true); setError('')

    let imagen_url = ''
    if (file) {
      setUploading(true)
      const sb = createClient()
      const ext = file.name.split('.').pop()
      const path = `tickets-it/${Date.now()}.${ext}`
      const { error: upErr } = await sb.storage.from('adjuntos').upload(path, file)
      if (!upErr) {
        const { data } = sb.storage.from('adjuntos').getPublicUrl(path)
        imagen_url = data.publicUrl
      }
      setUploading(false)
    }

    const res = await fetch('/api/tickets-it', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, imagen_url }),
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
        <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Ticket enviado!</h1>
        <p className="text-slate-500 text-sm">Tu ticket de soporte IT fue recibido. El equipo lo revisará a la brevedad.</p>
        <button onClick={() => { setStep('form'); setForm(f => ({...f, sistema:'' as Sistema, descripcion:'', modulo_tourplan:'' as ModuloTP})) }}
          className="mt-6 text-sm text-blue-600 hover:underline">Enviar otro ticket</button>
        <p className="text-slate-400 text-xs mt-4">Say Hueque · Atlas Archive</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ width:40, height:40, borderRadius:8, border:'1px solid #c9a96e', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0a' }}>
              <span style={{ fontSize:13, fontWeight:800, color:'#c9a96e' }}>A</span>
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#c9a96e', letterSpacing:'0.1em', textTransform:'uppercase' }}>Atlas</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#1e293b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Archive</span>
              </div>
              <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Say Hueque · Soporte IT</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Alta de Ticket de Soporte IT</h1>
          <p className="text-slate-400 text-xs mt-2">Reportá errores o problemas en los sistemas internos</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">

          {/* Datos básicos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">📧 Datos del solicitante</h2>
            <Field label="Tu mail" req>
              <input type="email" value={form.mail_solicitante} onChange={set('mail_solicitante')} className={inputCls} placeholder="tu@sayhueque.com" />
            </Field>
          </div>

          {/* Sistema */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">🖥️ ¿Dónde detectás el error?</h2>
            <Field label="Sistema" req>
              <select value={form.sistema} onChange={set('sistema')} className={inputCls}>
                <option value="">Seleccioná el sistema…</option>
                {['Tourplan','Pythagoras/Bazar','Backend B2C','Vamoos','Otro'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* ── TOURPLAN ── */}
          {form.sistema === 'Tourplan' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-4">📋 Tourplan — Detalle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Módulo" req span2>
                  <select value={form.modulo_tourplan} onChange={set('modulo_tourplan')} className={inputCls}>
                    <option value="">Seleccioná el módulo…</option>
                    {['COTIZ.PCM','FITS','GRUPOS','CLIENTES','PROVEEDORES','CONFIG. DE PRODUCTO','OTRO'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>

                {/* PCM / FITS / GRUPOS */}
                {moduloTPesPCMFITS && (<>
                  <Field label="Código del File" req>
                    <input value={form.codigo_file} onChange={set('codigo_file')} className={inputCls} placeholder="Ej: 12345" />
                  </Field>
                  <Field label="Nro. de Voucher de Servicio">
                    <input value={form.nro_voucher} onChange={set('nro_voucher')} className={inputCls} placeholder="Opcional" />
                  </Field>
                </>)}

                {/* CLIENTES / PROVEEDORES / CONFIG */}
                {moduloTPesOtros && (<>
                  <Field label="Código Cliente/Proveedor" req>
                    <input value={form.codigo_cliente_proveedor} onChange={set('codigo_cliente_proveedor')} className={inputCls} placeholder="Código" />
                  </Field>
                  <Field label="Código Producto">
                    <input value={form.codigo_producto} onChange={set('codigo_producto')} className={inputCls} placeholder="Opcional" />
                  </Field>
                </>)}
              </div>
            </div>
          )}

          {/* ── PYTHAGORAS ── */}
          {form.sistema === 'Pythagoras/Bazar' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-4">📋 Pythagoras/Bazar — Detalle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Módulo" req span2>
                  <select value={form.modulo_pythagoras} onChange={set('modulo_pythagoras')} className={inputCls}>
                    <option value="">Seleccioná el módulo…</option>
                    {['CUENTAS POR COBRAR','CUENTAS POR PAGAR','BAZAR','OTRO'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Código File Tourplan" req>
                  <input value={form.codigo_file_tourplan} onChange={set('codigo_file_tourplan')} className={inputCls} placeholder="Código file en TP" />
                </Field>
                <Field label="Código File Pythagoras">
                  <input value={form.codigo_file_pythagoras} onChange={set('codigo_file_pythagoras')} className={inputCls} placeholder="Opcional" />
                </Field>
              </div>
            </div>
          )}

          {/* ── BACKEND B2C ── */}
          {form.sistema === 'Backend B2C' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-4">📋 Backend B2C — Detalle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Módulo" req span2>
                  <select value={form.modulo_b2c} onChange={set('modulo_b2c')} className={inputCls}>
                    <option value="">Seleccioná el módulo…</option>
                    {['FIT','PCM','OTRO'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Link del Itinerario" req span2>
                  <input value={form.link_itinerario} onChange={set('link_itinerario')} className={inputCls} placeholder="https://…" />
                </Field>
              </div>
            </div>
          )}

          {/* Descripción + adjunto — para todos */}
          {form.sistema && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-4">📝 Descripción</h2>
              <div className="flex flex-col gap-4">
                <Field label="Descripción completa del error" req>
                  <textarea value={form.descripcion} onChange={set('descripcion')} rows={5} className={inputCls}
                    placeholder="Describí con detalle qué pasó, cómo reproducirlo y qué esperabas que pasara…" style={{ resize: 'vertical' }} />
                </Field>

                {/* Adjunto */}
                <Field label="Adjunto (opcional)">
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${file ? '#22c55e' : '#e2e8f0'}`,
                      borderRadius: 10, padding: '16px', textAlign: 'center',
                      cursor: 'pointer', background: file ? '#f0fdf4' : '#fafafa',
                    }}>
                    <input ref={fileRef} type="file" style={{ display:'none' }} accept="image/*,.pdf"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        {file.type.startsWith('image/') && (
                          <img src={URL.createObjectURL(file)} alt="preview" style={{ maxHeight:60, maxWidth:120, borderRadius:6, objectFit:'contain' }} />
                        )}
                        <span className="text-sm text-slate-600 font-medium">{file.name}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:18 }}>×</button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        <span className="font-semibold text-blue-600">Hacé click</span>, arrastrá o pegá con <span className="font-semibold text-blue-600">Ctrl+V</span>
                      </p>
                    )}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading || uploading || !form.sistema}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all shadow-sm"
            style={{ background: (loading || uploading || !form.sistema) ? '#94a3b8' : '#e8573f' }}>
            {uploading ? 'Subiendo adjunto…' : loading ? 'Enviando…' : 'Enviar ticket de soporte →'}
          </button>
        </form>
      </div>
    </div>
  )
}
