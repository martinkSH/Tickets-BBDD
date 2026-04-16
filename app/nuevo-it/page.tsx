'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  // Editor de bloques: texto e imágenes intercalados
  type Bloque = { id: string; tipo: 'texto' | 'imagen'; texto?: string; file?: File; url?: string }
  const [bloques, setBloques] = useState<Bloque[]>([
    { id: 'b0', tipo: 'texto', texto: '' }
  ])
  const fileRef = useRef<HTMLInputElement>(null)
  const insertImgAfterRef = useRef<string|null>(null) // ID del bloque después del cual insertar

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

  // ── helpers de bloques ────────────────────────────────────────────────────
  const uid = () => Math.random().toString(36).slice(2)

  const insertarImagen = (file: File, despuesDeId: string | null) => {
    setBloques(prev => {
      const bloqueImg: Bloque = { id: uid(), tipo: 'imagen', file }
      const bloqueTexto: Bloque = { id: uid(), tipo: 'texto', texto: '' }
      if (!despuesDeId) return [...prev, bloqueImg, bloqueTexto]
      const idx = prev.findIndex(b => b.id === despuesDeId)
      const pos = idx >= 0 ? idx + 1 : prev.length
      const nuevo = [...prev]
      nuevo.splice(pos, 0, bloqueImg, bloqueTexto)
      return nuevo
    })
  }

  const actualizarTexto = (id: string, texto: string) => {
    setBloques(prev => prev.map(b => b.id === id ? { ...b, texto } : b))
  }

  const eliminarBloque = (id: string) => {
    setBloques(prev => {
      const filtered = prev.filter(b => b.id !== id)
      // Siempre debe haber al menos un bloque de texto
      return filtered.length === 0 ? [{ id: uid(), tipo: 'texto', texto: '' }] : filtered
    })
  }

  // Paste global — detecta en qué textarea está el cursor
  const activeTextareaIdRef = useRef<string|null>(null)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const blob = item.getAsFile()
          if (blob) {
            const f = new File([blob], `captura-${Date.now()}.png`, { type: blob.type })
            insertarImagen(f, activeTextareaIdRef.current)
          }
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  // Construir descripción y archivos al hacer submit
  const buildDescripcionYFiles = () => {
    const partes: string[] = []
    const archivos: File[] = []
    let imgIdx = 0
    for (const b of bloques) {
      if (b.tipo === 'texto' && b.texto?.trim()) {
        partes.push(b.texto.trim())
      } else if (b.tipo === 'imagen' && b.file) {
        imgIdx++
        partes.push(`[Imagen ${imgIdx}]`)
        archivos.push(b.file)
      }
    }
    return { descripcion: partes.join('\n'), archivos }
  }

  const moduloTPesPCMFITS = ['COTIZ.PCM','FITS','GRUPOS'].includes(form.modulo_tourplan)
  const moduloTPesOtros = ['CLIENTES','PROVEEDORES','CONFIG. DE PRODUCTO'].includes(form.modulo_tourplan)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { descripcion: desc, archivos } = buildDescripcionYFiles()
    if (!form.mail_solicitante || !form.sistema || !desc) {
      setError('Completá los campos obligatorios: mail, sistema y descripción.'); return
    }
    setLoading(true); setError('')

    const imagenes_urls: string[] = []
    if (archivos.length > 0) {
      setUploading(true)
      const sb = createClient()
      for (const f of archivos) {
        const ext = f.name.split('.').pop()
        const path = `tickets-it/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await sb.storage.from('adjuntos').upload(path, f)
        if (!upErr) {
          const { data } = sb.storage.from('adjuntos').getPublicUrl(path)
          imagenes_urls.push(data.publicUrl)
        }
      }
      setUploading(false)
    }

    const res = await fetch('/api/tickets-it', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, descripcion: desc, imagen_url: imagenes_urls[0]||'', imagenes_urls }),
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
                {/* Editor de bloques: texto + imágenes intercaladas */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción completa del error <span className="text-red-400">*</span>
                    <span className="text-xs text-slate-400 ml-2">Podés pegar imágenes con Ctrl+V dentro de cualquier bloque de texto</span>
                  </label>
                  <input ref={fileRef} type="file" style={{ display:'none' }} accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) insertarImagen(f, insertImgAfterRef.current)
                    }} />

                  <div style={{ border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden', background:'white' }}>
                    {bloques.map((bloque, idx) => (
                      <div key={bloque.id}>
                        {bloque.tipo === 'texto' ? (
                          <div style={{ position:'relative' }}>
                            <textarea
                              value={bloque.texto}
                              onChange={e => actualizarTexto(bloque.id, e.target.value)}
                              onFocus={() => { activeTextareaIdRef.current = bloque.id }}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault()
                                const f = e.dataTransfer.files[0]
                                if (f?.type.startsWith('image/')) insertarImagen(f, bloque.id)
                              }}
                              placeholder={idx === 0 ? 'Describí el problema... (podés pegar imágenes con Ctrl+V)' : 'Continuá describiendo...'}
                              rows={idx === 0 ? 4 : 2}
                              style={{
                                width:'100%', border:'none', outline:'none', resize:'none',
                                padding:'12px 14px', fontSize:14, fontFamily:'inherit',
                                boxSizing:'border-box', background:'transparent', lineHeight:1.6,
                                borderBottom: idx < bloques.length-1 ? '1px solid #f1f5f9' : 'none',
                              }}
                            />
                            {/* Botón para insertar imagen después de este bloque */}
                            <button
                              type="button"
                              title="Insertar imagen aquí"
                              onClick={() => { insertImgAfterRef.current = bloque.id; fileRef.current?.click() }}
                              style={{
                                position:'absolute', bottom:6, right:8,
                                background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6,
                                padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#6b7280',
                                display:'flex', alignItems:'center', gap:4, opacity:0.7,
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity='1'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity='0.7'}>
                              📷 imagen
                            </button>
                          </div>
                        ) : (
                          <div style={{ position:'relative', background:'#f8fafc', borderBottom: idx < bloques.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                            {bloque.file && (
                              <img
                                src={URL.createObjectURL(bloque.file)}
                                alt="Imagen adjunta"
                                style={{ maxWidth:'100%', maxHeight:400, display:'block', margin:'0 auto', padding:'8px' }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => eliminarBloque(bloque.id)}
                              style={{
                                position:'absolute', top:6, right:8,
                                background:'rgba(0,0,0,0.5)', border:'none', borderRadius:'50%',
                                width:22, height:22, color:'white', cursor:'pointer', fontSize:14,
                                display:'flex', alignItems:'center', justifyContent:'center',
                              }}>×</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={{ margin:'6px 0 0', fontSize:11, color:'#9ca3af' }}>
                    💡 Pegá capturas de pantalla con <strong>Ctrl+V</strong>, arrastrá imágenes, o usá el botón 📷 para insertarlas entre el texto
                  </p>
                </div>
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
