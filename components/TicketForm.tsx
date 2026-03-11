'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MOTIVOS_TARIFAS, MOTIVOS_BD } from '@/lib/types'
import MailAutocomplete from './MailAutocomplete'

type Step = 'form' | 'success'

export default function TicketForm() {
  const [step, setStep] = useState<Step>('form')
  const [numero, setNumero] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileUploading, setFileUploading] = useState(false)
  const [fileDragging, setFileDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const blank = {
    mail_solicitante: '', area_afectada: '' as '' | 'Tarifas' | 'Base de Datos' | 'Otro',
    motivo_tarifas: '', motivo_bd: '', proveedor: '', ciudad: '',
    tipo_servicio: '', fechas_servicio: '', descripcion: '', imagen_url: '',
  }
  const [form, setForm] = useState(blank)
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Subir archivo si hay uno
      let imagen_url = form.imagen_url
      if (file) {
        setFileUploading(true)
        const sb = createClient()
        const ext = file.name.split('.').pop()
        const path = `tickets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await sb.storage
          .from('adjuntos')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error('Error al subir el archivo: ' + uploadError.message)
        const { data: urlData } = sb.storage.from('adjuntos').getPublicUrl(path)
        imagen_url = urlData.publicUrl
        setFileUploading(false)
      }

      const res = await fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imagen_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNumero(data.ticket.numero)
      setStep('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setFileUploading(false)
    } finally { setLoading(false) }
  }

  if (step === 'success') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">¡Ticket creado!</h2>
        <p className="text-slate-500 mb-1">Tu solicitud fue registrada correctamente.</p>
        <p className="text-slate-500 mb-6">
          N°: <span className="font-mono font-bold text-brand-700">{numero}</span>
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Recibirás un mail cuando sea asignado y cuando esté resuelto.
        </p>
        <button onClick={() => { setStep('form'); setForm(blank) }}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors">
          Cargar otro ticket
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-sm">Sistema de Tickets</h1>
            <p className="text-xs text-slate-400">Base de Datos & Tarifas · Sayhueque</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Nueva solicitud</h2>
          <p className="text-slate-500 text-sm mt-1">Completá el formulario y un responsable recibirá tu pedido.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Mail */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tu mail <span className="text-red-400">*</span>
            </label>
            <MailAutocomplete
              required
              value={form.mail_solicitante}
              onChange={v => setForm(f => ({ ...f, mail_solicitante: v }))}
              placeholder="nombre@sayhueque.com"
            />
          </div>

          {/* Área */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Área afectada <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Tarifas', 'Base de Datos', 'Otro'] as const).map(a => (
                <button key={a} type="button"
                  onClick={() => setForm(p => ({ ...p, area_afectada: a, motivo_tarifas: '', motivo_bd: '' }))}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    form.area_afectada === a
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Motivo condicional */}
          {form.area_afectada === 'Tarifas' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fadeIn">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo – Tarifas</label>
              <select value={form.motivo_tarifas} onChange={set('motivo_tarifas')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Seleccionar...</option>
                {MOTIVOS_TARIFAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          )}
          {form.area_afectada === 'Base de Datos' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fadeIn">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo – Base de Datos</label>
              <select value={form.motivo_bd} onChange={set('motivo_bd')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Seleccionar...</option>
                {MOTIVOS_BD.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          )}

          {/* Datos servicio */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Datos del servicio</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'proveedor', label: 'Proveedor', placeholder: 'Ej: Hotel Del Paine' },
                { k: 'ciudad', label: 'Ciudad / Destino', placeholder: 'Ej: Torres del Paine' },
                { k: 'tipo_servicio', label: 'Tipo de servicio (PVT/SIC/SPVT/Cat. de HAB)', placeholder: 'Ej: PVT, SIC, SPVT, Cat. de HAB' },
                { k: 'fechas_servicio', label: 'Fecha / Rango del servicio en cuestión', placeholder: 'Ej: Dic 2025' },
              ].map(({ k, label, placeholder }) => (
                <div key={k}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input type="text" value={form[k as keyof typeof form]}
                    onChange={set(k as keyof typeof form)} placeholder={placeholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descripción del pedido <span className="text-red-400">*</span>
            </label>
            <textarea required rows={4} value={form.descripcion} onChange={set('descripcion')}
              placeholder="Contanos con detalle qué necesitás..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          {/* Adjunto */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Adjunto (opcional)</label>
            <div
              onDragOver={e => { e.preventDefault(); setFileDragging(true) }}
              onDragLeave={() => setFileDragging(false)}
              onDrop={e => {
                e.preventDefault(); setFileDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) setFile(f)
              }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${fileDragging ? '#6366f1' : file ? '#22c55e' : '#e2e8f0'}`,
                borderRadius: 10, padding: '20px 16px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
                background: fileDragging ? '#f5f3ff' : file ? '#f0fdf4' : '#fafafa',
              }}>
              <input ref={fileRef} type="file" style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{file.name}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ) : (
                <div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px' }}>
                    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                    <span style={{ fontWeight: 600, color: '#6366f1' }}>Hacé click</span> o arrastrá un archivo
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Imágenes, PDF, Word, Excel — máx. 10MB</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={loading || fileUploading || !form.area_afectada}
            className="w-full py-3 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm">
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </main>
    </div>
  )
}
