import { useState, useEffect, useMemo, useCallback } from 'react'

// ─── Constantes ───────────────────────────────────────────────
const STATUTS = ['Brouillon', 'Envoyée', 'Relancée', 'Entretien', 'Offre reçue', 'Refus', 'Retirée']
const TYPES = ['Stage', 'Alternance', 'CDI', 'CDD', 'Freelance']
const STORAGE_KEY = 'kandidat_data'

const STATUT_COLORS = {
  'Brouillon': '#6b7280',
  'Envoyée': '#3b82f6',
  'Relancée': '#f59e0b',
  'Entretien': '#8b5cf6',
  'Offre reçue': '#10b981',
  'Refus': '#ef4444',
  'Retirée': '#64748b',
}

const emptyCandidate = () => ({
  id: crypto.randomUUID(),
  entreprise: '',
  poste: '',
  type: 'Stage',
  dateCandidature: new Date().toISOString().slice(0, 10),
  statut: 'Brouillon',
  lienOffre: '',
  contactNom: '',
  contactEmail: '',
  notes: '',
  prochainesEtapes: '',
  dateRelance: '',
  dateEntretien: '',
})

// ─── Helpers ──────────────────────────────────────────────────
// Détecte si on tourne dans Electron (avec le preload bridge)
const isElectron = typeof window !== 'undefined' && !!window.kandidatStore

async function loadDataAsync() {
  if (isElectron) {
    try {
      const data = await window.kandidatStore.load()
      if (data) return data
      // Migration : récupérer les données localStorage existantes
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        await window.kandidatStore.save(parsed)
        return parsed
      }
      return []
    } catch { return [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveData(data) {
  if (isElectron) {
    window.kandidatStore.save(data)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function exportCSV(candidatures) {
  const headers = ['Entreprise', 'Poste', 'Type', 'Date candidature', 'Statut', 'Lien offre', 'Contact nom', 'Contact email', 'Notes', 'Prochaines étapes', 'Date relance', 'Date entretien']
  const rows = candidatures.map(c => [c.entreprise, c.poste, c.type, c.dateCandidature, c.statut, c.lienOffre, c.contactNom, c.contactEmail, c.notes, c.prochainesEtapes, c.dateRelance, c.dateEntretien].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  download(csv, 'kandidat_export.csv', 'text/csv')
}

function exportJSON(candidatures) {
  download(JSON.stringify(candidatures, null, 2), 'kandidat_export.json', 'application/json')
}

function download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  return Math.ceil(diff)
}

// ─── Composants ───────────────────────────────────────────────

function Badge({ statut }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 600,
      background: STATUT_COLORS[statut] + '22',
      color: STATUT_COLORS[statut],
      border: `1px solid ${STATUT_COLORS[statut]}44`,
    }}>
      {statut}
    </span>
  )
}

function DeadlineAlert({ candidature }) {
  const alerts = []
  const dRelance = daysUntil(candidature.dateRelance)
  const dEntretien = daysUntil(candidature.dateEntretien)

  if (dRelance !== null && dRelance <= 3 && dRelance >= 0) {
    alerts.push(
      <span key="relance" style={{ ...styles.alert, background: '#f59e0b22', color: '#f59e0b', borderColor: '#f59e0b44' }}>
        ⏰ Relance {dRelance === 0 ? "aujourd'hui" : `dans ${dRelance}j`}
      </span>
    )
  }
  if (dEntretien !== null && dEntretien <= 7 && dEntretien >= 0) {
    alerts.push(
      <span key="entretien" style={{ ...styles.alert, background: '#8b5cf622', color: '#8b5cf6', borderColor: '#8b5cf644' }}>
        🎯 Entretien {dEntretien === 0 ? "aujourd'hui" : `dans ${dEntretien}j`}
      </span>
    )
  }
  if (dRelance !== null && dRelance < 0) {
    alerts.push(
      <span key="relance-late" style={{ ...styles.alert, background: '#ef444422', color: '#ef4444', borderColor: '#ef444444' }}>
        ⚠️ Relance en retard ({Math.abs(dRelance)}j)
      </span>
    )
  }

  return alerts.length > 0 ? <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>{alerts}</div> : null
}

function CandidatureForm({ candidature, onSave, onCancel }) {
  const [form, setForm] = useState(candidature)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.entreprise.trim() || !form.poste.trim()) return
    onSave(form)
  }

  return (
    <div style={styles.modalOverlay} onClick={onCancel}>
      <form style={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px', color: '#f4f4f5' }}>
          {candidature.entreprise ? 'Modifier la candidature' : 'Nouvelle candidature'}
        </h2>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Entreprise *</label>
            <input style={styles.input} value={form.entreprise} onChange={handleChange('entreprise')} placeholder="Ex: Google" required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Poste *</label>
            <input style={styles.input} value={form.poste} onChange={handleChange('poste')} placeholder="Ex: Développeur Frontend" required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Type</label>
            <select style={styles.input} value={form.type} onChange={handleChange('type')}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Statut</label>
            <select style={styles.input} value={form.statut} onChange={handleChange('statut')}>
              {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Date de candidature</label>
            <input style={styles.input} type="date" value={form.dateCandidature} onChange={handleChange('dateCandidature')} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Lien vers l'offre</label>
            <input style={styles.input} value={form.lienOffre} onChange={handleChange('lienOffre')} placeholder="https://..." />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contact RH — Nom</label>
            <input style={styles.input} value={form.contactNom} onChange={handleChange('contactNom')} placeholder="Ex: Marie Dupont" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contact RH — Email</label>
            <input style={styles.input} type="email" value={form.contactEmail} onChange={handleChange('contactEmail')} placeholder="marie@entreprise.com" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Date de relance</label>
            <input style={styles.input} type="date" value={form.dateRelance} onChange={handleChange('dateRelance')} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Date d'entretien</label>
            <input style={styles.input} type="date" value={form.dateEntretien} onChange={handleChange('dateEntretien')} />
          </div>
        </div>

        <div style={{ ...styles.formGroup, marginTop: '4px' }}>
          <label style={styles.label}>Notes personnelles</label>
          <textarea style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} value={form.notes} onChange={handleChange('notes')} placeholder="Notes libres..." />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Prochaines étapes</label>
          <textarea style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} value={form.prochainesEtapes} onChange={handleChange('prochainesEtapes')} placeholder="À faire ensuite..." />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="button" onClick={onCancel} style={styles.btnSecondary}>Annuler</button>
          <button type="submit" style={styles.btnPrimary}>Sauvegarder</button>
        </div>
      </form>
    </div>
  )
}

function CandidatureCard({ candidature, onEdit, onDelete }) {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f4f4f5' }}>{candidature.entreprise}</h3>
            <Badge statut={candidature.statut} />
          </div>
          <p style={{ fontSize: '14px', color: '#a1a1aa' }}>{candidature.poste}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onEdit(candidature)} style={styles.btnIcon} title="Modifier">✏️</button>
          <button onClick={() => onDelete(candidature.id)} style={styles.btnIcon} title="Supprimer">🗑️</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', color: '#71717a' }}>
        <span>📋 {candidature.type}</span>
        <span>📅 {candidature.dateCandidature}</span>
        {candidature.contactNom && <span>👤 {candidature.contactNom}</span>}
        {candidature.lienOffre && (
          <a href={candidature.lienOffre} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            🔗 Voir l'offre
          </a>
        )}
      </div>

      {candidature.notes && (
        <p style={{ marginTop: '8px', fontSize: '13px', color: '#a1a1aa', fontStyle: 'italic' }}>
          {candidature.notes.length > 120 ? candidature.notes.slice(0, 120) + '...' : candidature.notes}
        </p>
      )}

      {candidature.prochainesEtapes && (
        <p style={{ marginTop: '4px', fontSize: '13px', color: '#8b5cf6' }}>
          → {candidature.prochainesEtapes.length > 100 ? candidature.prochainesEtapes.slice(0, 100) + '...' : candidature.prochainesEtapes}
        </p>
      )}

      <DeadlineAlert candidature={candidature} />
    </div>
  )
}

function StatsBar({ candidatures }) {
  const counts = {}
  STATUTS.forEach(s => { counts[s] = 0 })
  candidatures.forEach(c => { counts[c.statut] = (counts[c.statut] || 0) + 1 })

  return (
    <div style={styles.statsBar}>
      {STATUTS.map(s => (
        <div key={s} style={styles.statItem}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: STATUT_COLORS[s] }}>{counts[s]}</span>
          <span style={{ fontSize: '11px', color: '#71717a' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [candidatures, setCandidatures] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(null) // null = fermé, objet = édition/création
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterType, setFilterType] = useState('Tous')
  const [sortBy, setSortBy] = useState('date-desc')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Chargement initial (async pour Electron, sync fallback pour navigateur)
  useEffect(() => {
    loadDataAsync().then(data => {
      setCandidatures(data)
      setLoaded(true)
    })
  }, [])

  // Sauvegarde à chaque changement (seulement après le chargement initial)
  useEffect(() => {
    if (loaded) saveData(candidatures)
  }, [candidatures, loaded])

  const filtered = useMemo(() => {
    let list = [...candidatures]

    if (filterStatut !== 'Tous') list = list.filter(c => c.statut === filterStatut)
    if (filterType !== 'Tous') list = list.filter(c => c.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.entreprise.toLowerCase().includes(q) ||
        c.poste.toLowerCase().includes(q) ||
        c.contactNom.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return a.dateCandidature.localeCompare(b.dateCandidature)
        case 'date-desc': return b.dateCandidature.localeCompare(a.dateCandidature)
        case 'entreprise': return a.entreprise.localeCompare(b.entreprise)
        case 'statut': return STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut)
        default: return 0
      }
    })

    return list
  }, [candidatures, filterStatut, filterType, sortBy, search])

  const handleSave = useCallback((form) => {
    setCandidatures(prev => {
      const idx = prev.findIndex(c => c.id === form.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = form
        return updated
      }
      return [...prev, form]
    })
    setEditing(null)
  }, [])

  const handleDelete = useCallback((id) => {
    setCandidatures(prev => prev.filter(c => c.id !== id))
    setConfirmDelete(null)
  }, [])

  const urgentAlerts = useMemo(() => {
    return candidatures.filter(c => {
      const dR = daysUntil(c.dateRelance)
      const dE = daysUntil(c.dateEntretien)
      return (dR !== null && dR <= 3 && dR >= -7) || (dE !== null && dE <= 7 && dE >= 0)
    })
  }, [candidatures])

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#3b82f6' }}>K</span>andidat
          </h1>
          <p style={{ fontSize: '13px', color: '#71717a', marginTop: '2px' }}>
            {candidatures.length} candidature{candidatures.length !== 1 ? 's' : ''} suivie{candidatures.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => exportCSV(candidatures)} style={styles.btnSecondary} title="Exporter en CSV">📄 CSV</button>
          <button onClick={() => exportJSON(candidatures)} style={styles.btnSecondary} title="Exporter en JSON">📦 JSON</button>
          <button onClick={() => setEditing(emptyCandidate())} style={styles.btnPrimary}>+ Nouvelle candidature</button>
        </div>
      </header>

      {/* Stats */}
      <StatsBar candidatures={candidatures} />

      {/* Alertes urgentes */}
      {urgentAlerts.length > 0 && (
        <div style={styles.alertBanner}>
          <span style={{ fontWeight: 600 }}>🔔 {urgentAlerts.length} action{urgentAlerts.length > 1 ? 's' : ''} à venir</span>
          <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
            {urgentAlerts.map(c => c.entreprise).join(', ')}
          </span>
        </div>
      )}

      {/* Filtres */}
      <div style={styles.filters}>
        <input
          style={{ ...styles.input, flex: 1, minWidth: '180px' }}
          placeholder="🔍 Rechercher entreprise, poste, contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={styles.input} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="Tous">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={styles.input} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="Tous">Tous les types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={styles.input} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date-desc">Date ↓</option>
          <option value="date-asc">Date ↑</option>
          <option value="entreprise">Entreprise A-Z</option>
          <option value="statut">Statut</option>
        </select>
      </div>

      {/* Liste */}
      <div style={styles.list}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '40px' }}>📭</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#a1a1aa' }}>Aucune candidature</p>
            <p style={{ fontSize: '13px', color: '#71717a' }}>
              {candidatures.length === 0
                ? 'Cliquez sur "Nouvelle candidature" pour commencer'
                : 'Aucun résultat pour ces filtres'}
            </p>
          </div>
        ) : (
          filtered.map(c => (
            <CandidatureCard
              key={c.id}
              candidature={c}
              onEdit={setEditing}
              onDelete={(id) => setConfirmDelete(id)}
            />
          ))
        )}
      </div>

      {/* Modale formulaire */}
      {editing && (
        <CandidatureForm
          candidature={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Modale confirmation suppression */}
      {confirmDelete && (
        <div style={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...styles.modal, maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Supprimer cette candidature ?</p>
            <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '20px' }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={styles.btnSecondary}>Annuler</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ ...styles.btnPrimary, background: '#ef4444' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '24px 20px',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  statsBar: {
    display: 'flex',
    gap: '2px',
    marginBottom: '20px',
    background: '#18181b',
    borderRadius: '12px',
    padding: '12px',
    justifyContent: 'space-around',
    border: '1px solid #27272a',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  alertBanner: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f59e0b11',
    border: '1px solid #f59e0b33',
    borderRadius: '10px',
    marginBottom: '16px',
    color: '#f59e0b',
    fontSize: '14px',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  input: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#a1a1aa',
    marginBottom: '4px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '16px',
    transition: 'border-color 0.2s',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '8px',
  },
  alert: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
  },
  btnPrimary: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  },
  btnSecondary: {
    background: '#27272a',
    color: '#e4e4e7',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  },
  btnIcon: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#1c1c21',
    borderRadius: '16px',
    padding: '28px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #27272a',
  },
}
