// ============================================================
//  TABLEAU KANBAN 🫧
//  Logique : page charge → lire LocalStorage → afficher tâches
//            formulaire → créer tâche → sauvegarder → afficher
//            boutons carte → changer statut / modifier / supprimer
// ============================================================

// ── Sélection des éléments du DOM ──────────────────────────
const form        = document.getElementById('taskForm')
const inputTitle  = document.querySelector('.title')
const inputDesc   = document.querySelector('.description')
const inputPrio   = document.querySelector('.priorite')
const dateDisplay = document.getElementById('dateDisplay')  // input texte lu seul (affichage date)
const calPopup    = document.getElementById('calPopup')     // popup calendrier

const colToDo = document.getElementById('toDo')
const colInPro = document.getElementById('inPro')
const colDone  = document.getElementById('done')

const searchInput  = document.getElementById('searchInput')
const searchBtn    = document.getElementById('searchBtn')
const sortSelect   = document.getElementById('sortSelect')
const filterBtn    = document.getElementById('filterBtn')
const filterPanel  = document.getElementById('filterPanel')
const modal        = document.getElementById('modal')
const editDate     = document.getElementById('editDate')

// ── État de l'appli ─────────────────────────────────────────
const today   = new Date().toISOString().split('T')[0]  // date du jour "YYYY-MM-DD"
const filtres = { prio: '', status: '', date: '' }       // filtres actifs dans le panneau
let editingId        = null  // id de la tâche en cours d'édition
let dateSelectionnee = ''    // date choisie dans le calendrier
let calMois          = new Date()  // mois affiché dans le calendrier

editDate.setAttribute('max', today)  // empêche de choisir une date future dans le modal

// ── LocalStorage : lire / écrire ────────────────────────────
// lire() renvoie le tableau de tâches stocké (ou [] si vide)
const lire   = () => JSON.parse(localStorage.getItem('taches')) || []
// ecrire(t) sauvegarde le tableau de tâches complet
const ecrire = t  => localStorage.setItem('taches', JSON.stringify(t))

// ── Constantes d'affichage ───────────────────────────────────
const STATUT_SUIVANT = { toDo: 'inPro', inPro: 'done' }         // progression normale
const STATUT_LABEL   = { toDo: '→ In Progress', inPro: '→ Done' }
const PRIO_ORDRE     = { high: 0, moyen: 1, low: 2, '': 3 }     // pour le tri
const PRIO_LABEL     = { low: '🟢 Low', moyen: '🟡 Moyen', high: '🔴 High' }
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS = ['Lu','Ma','Me','Je','Ve','Sa','Di']

// Renvoie la colonne DOM correspondant au statut
const getCol = s => s === 'inPro' ? colInPro : s === 'done' ? colDone : colToDo

// ── Création d'une carte tâche ───────────────────────────────
function creerCarte(t) {
    const c = document.createElement('div')
    // Les tâches "done" ont une classe supplémentaire pour le fond vert
    c.className = 'task-card' + (t.statut === 'done' ? ' done-card' : '')
    c.dataset.id = t.id

    const retard  = t.date && t.date < today && t.statut !== 'done'
    const dateAff = t.date ? (retard ? '⚠️ ' : '📅 ') + t.date : ''

    // Tâche "done" → 2 boutons de retour  |  autres → 1 bouton d'avancement
    const btnsSt = t.statut === 'done'
        ? `<button class="btn-statut btn-todo">↩ To Do</button>
           <button class="btn-statut btn-inpro">↩ In Progress</button>`
        : `<button class="btn-statut">${STATUT_LABEL[t.statut]}</button>`

    c.innerHTML = `
        <p class="task-title">${t.titre}</p>
        ${t.description ? `<p class="task-desc">${t.description}</p>` : ''}
        <div class="task-meta">
            <span>${PRIO_LABEL[t.priorite] || ''}</span>
            <span class="${retard ? 'overdue' : ''}">${dateAff}</span>
        </div>
        <div class="task-btns">
            ${btnsSt}
            <button class="btn-edit">✏️</button>
            <button class="btn-del">🗑️</button>
        </div>`

    // Branchement des boutons selon le statut
    if (t.statut === 'done') {
        c.querySelector('.btn-todo').onclick  = () => changerStatut(t.id, 'toDo')
        c.querySelector('.btn-inpro').onclick = () => changerStatut(t.id, 'inPro')
    } else {
        c.querySelector('.btn-statut').onclick = () => changerStatut(t.id, STATUT_SUIVANT[t.statut])
    }
    c.querySelector('.btn-edit').onclick = () => ouvrirModal(t.id)
    c.querySelector('.btn-del').onclick  = () => { ecrire(lire().filter(x => x.id !== t.id)); renderAll() }

    return c
}

// Change le statut d'une tâche et rafraîchit l'affichage
function changerStatut(id, statut) {
    const taches = lire()
    taches.find(t => t.id === id).statut = statut
    ecrire(taches); renderAll()
}

// ── Rendu complet du tableau ─────────────────────────────────
function renderAll() {
    // Vider les cartes de chaque colonne sans toucher aux titres h2
    ;[colToDo, colInPro, colDone].forEach(col =>
        col.querySelectorAll('.task-card').forEach(c => c.remove())
    )

    let taches = lire()

    // Recherche par texte dans le titre et la description
    const q = searchInput.value.trim().toLowerCase()
    if (q) taches = taches.filter(t =>
        t.titre.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    )

    // Filtres du panneau
    if (filtres.prio)   taches = taches.filter(t => t.priorite === filtres.prio)
    if (filtres.status) taches = taches.filter(t => t.statut   === filtres.status)

    const semaine = new Date(); semaine.setDate(semaine.getDate() + 7)
    const semStr  = semaine.toISOString().split('T')[0]
    if (filtres.date === 'overdue') taches = taches.filter(t => t.date && t.date < today)
    if (filtres.date === 'today')   taches = taches.filter(t => t.date === today)
    if (filtres.date === 'week')    taches = taches.filter(t => t.date >= today && t.date <= semStr)
    if (filtres.date === 'nodate')  taches = taches.filter(t => !t.date)

    // Tri
    const tri = sortSelect.value
    const tris = {
        alpha:  (a,b) => a.titre.localeCompare(b.titre),
        alphaZ: (a,b) => b.titre.localeCompare(a.titre),
        date:   (a,b) => (a.date||'9999').localeCompare(b.date||'9999'),
        dateD:  (a,b) => (b.date||'').localeCompare(a.date||''),
        prio:   (a,b) => (PRIO_ORDRE[a.priorite]??3) - (PRIO_ORDRE[b.priorite]??3),
        prioL:  (a,b) => (PRIO_ORDRE[b.priorite]??3) - (PRIO_ORDRE[a.priorite]??3)
    }
    if (tris[tri]) taches.sort(tris[tri])

    // Afficher chaque tâche dans sa colonne
    taches.forEach(t => getCol(t.statut).appendChild(creerCarte(t)))

    // Mettre à jour le badge du bouton filtre
    const n = Object.values(filtres).filter(Boolean).length
    filterBtn.textContent = n ? `🎯 Filter (${n})` : '🎯 Filter'
}

// ── Calendrier personnalisé ──────────────────────────────────
// Génère la grille du mois affiché dans calMois
function renderCal() {
    const y = calMois.getFullYear(), m = calMois.getMonth()
    const premierJour = (new Date(y, m, 1).getDay() + 6) % 7  // Lundi = 0
    const nbJours     = new Date(y, m + 1, 0).getDate()

    // En-têtes de jours + cases vides avant le 1er
    let cellules = JOURS.map(j => `<span class="cal-h">${j}</span>`).join('')
    for (let i = 0; i < premierJour; i++) cellules += '<span></span>'

    // Une case par jour du mois
    for (let d = 1; d <= nbJours; d++) {
        const ds  = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const cls = ['cal-day',
            ds < today          ? 'disabled'  : '',  // passé → grisé (pas de deadline dans le passé)
            ds === dateSelectionnee ? 'selected' : '',  // sélectionné → vert
            ds === today        ? 'today'     : ''   // aujourd'hui → bordure
        ].filter(Boolean).join(' ')
        cellules += `<span class="${cls}" data-d="${ds < today ? '' : ds}">${d}</span>`
    }

    calPopup.innerHTML = `
        <div class="cal-nav">
            <button id="calPrev">◀</button>
            <b>${MOIS[m]} ${y}</b>
            <button id="calNext">▶</button>
        </div>
        <div class="cal-grid">${cellules}</div>
        <button id="calConfirm">✓ Valider</button>`

    // Navigation mois précédent / suivant
    calPopup.querySelector('#calPrev').onclick = () => { calMois.setMonth(m - 1); renderCal() }
    calPopup.querySelector('#calNext').onclick = () => { calMois.setMonth(m + 1); renderCal() }

    // Clic sur un jour → le sélectionner et rafraîchir
    calPopup.querySelectorAll('.cal-day:not(.disabled)').forEach(el =>
        el.onclick = () => { dateSelectionnee = el.dataset.d; renderCal() }
    )

    // Bouton Valider → copier la date dans l'input d'affichage et fermer
    calPopup.querySelector('#calConfirm').onclick = () => {
        dateDisplay.value = dateSelectionnee || ''
        calPopup.classList.add('hidden')
    }
}

// Empêche les clics à l'intérieur du popup de remonter jusqu'au document
// (sinon le listener "fermer si clic ailleurs" se déclenche après chaque jour/mois)
calPopup.addEventListener('click', e => e.stopPropagation())

// Ouvrir le calendrier au clic sur l'input date
dateDisplay.addEventListener('click', e => {
    e.stopPropagation()
    calMois = dateSelectionnee ? new Date(dateSelectionnee) : new Date()
    renderCal()
    calPopup.classList.toggle('hidden')
})

// Fermer le calendrier si on clique ailleurs
document.addEventListener('click', e => {
    if (!calPopup.contains(e.target) && e.target !== dateDisplay)
        calPopup.classList.add('hidden')
})

// ── Modal d'édition ──────────────────────────────────────────
function ouvrirModal(id) {
    editingId = id
    const t = lire().find(t => t.id === id)
    document.getElementById('editTitle').value = t.titre
    document.getElementById('editDesc').value  = t.description
    document.getElementById('editPrio').value  = t.priorite
    editDate.value = t.date
    modal.classList.remove('hidden')
}

document.getElementById('saveEdit').onclick = () => {
    const titre = document.getElementById('editTitle').value.trim()
    if (!titre) return
    const taches = lire()
    Object.assign(taches.find(t => t.id === editingId), {
        titre,
        description: document.getElementById('editDesc').value.trim(),
        priorite:    document.getElementById('editPrio').value,
        date:        editDate.value
    })
    ecrire(taches); modal.classList.add('hidden'); editingId = null; renderAll()
}

document.getElementById('cancelEdit').onclick = () => {
    modal.classList.add('hidden'); editingId = null
}

// ── Formulaire d'ajout ───────────────────────────────────────
form.addEventListener('submit', e => {
    e.preventDefault()
    const titre = inputTitle.value.trim()
    if (!titre) { inputTitle.focus(); return }

    const taches = lire()
    taches.push({
        id:          Date.now(),      // identifiant unique basé sur le timestamp
        titre,
        description: inputDesc.value.trim(),
        priorite:    inputPrio.value,
        date:        dateDisplay.value,  // date confirmée dans le calendrier
        statut:      'toDo'
    })
    ecrire(taches)

    // Réinitialiser le formulaire sans toucher aux attributs (max, etc.)
    inputTitle.value = inputDesc.value = inputPrio.value = dateDisplay.value = ''
    dateSelectionnee = ''
    renderAll()
})

// ── Filtres & recherche ──────────────────────────────────────
// Ouvrir / fermer le panneau filtre
filterBtn.addEventListener('click', e => { e.stopPropagation(); filterPanel.classList.toggle('hidden') })
document.addEventListener('click', e => {
    if (!filterPanel.contains(e.target) && e.target !== filterBtn)
        filterPanel.classList.add('hidden')
})

// Boutons de filtre : activer le cliqué, désactiver les autres du groupe
document.querySelectorAll('.filter-group').forEach(groupe => {
    const key = groupe.id === 'grpPrio' ? 'prio' : groupe.id === 'grpStatus' ? 'status' : 'date'
    groupe.querySelectorAll('.fbtn').forEach(btn => {
        btn.onclick = () => {
            groupe.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            filtres[key] = btn.dataset.val
            renderAll()
        }
    })
})

// Bouton reset : effacer tous les filtres
document.getElementById('resetFilters').onclick = () => {
    filtres.prio = filtres.status = filtres.date = ''
    document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.fbtn[data-val=""]').forEach(b => b.classList.add('active'))
    renderAll()
}

// Recherche sur clic bouton ou touche Entrée
searchBtn.onclick = renderAll
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') renderAll() })
sortSelect.addEventListener('change', renderAll)

// ── Décor : bulles et poissons animés ───────────────────────
function creerDecor() {
    // 12 bulles 🫧 qui montent depuis le bas avec vitesse et délai aléatoires
    for (let i = 0; i < 12; i++) {
        const b = document.createElement('span')
        b.className = 'bulle'
        b.textContent = '🫧'
        Object.assign(b.style, {
            left:              Math.random() * 100 + 'vw',
            animationDelay:    Math.random() * 12 + 's',
            animationDuration: (7 + Math.random() * 9) + 's',
            fontSize:          (12 + Math.random() * 20) + 'px'
        })
        document.body.appendChild(b)
    }

    // 6 animaux marins qui nagent (alternant gauche↔droite)
    ;['🪼','','🪼','',''].forEach((emoji, i) => {
        const p = document.createElement('span')
        p.className = 'poisson'
        p.textContent = emoji
        Object.assign(p.style, {
            top:                   (5 + Math.random() * 85) + 'vh',
            fontSize:              (16 + Math.random() * 18) + 'px',
            animationName:         i % 2 === 0 ? 'nageGauche' : 'nageDroite',
            animationDuration:     (14 + Math.random() * 14) + 's',
            animationDelay:        Math.random() * 10 + 's',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear'
        })
        document.body.appendChild(p)
    })
}

// ── Animation vague sur les titres ───────────────────────────
// Chaque lettre devient un <span> avec un délai d'animation décalé
function animeVague(el) {
    const txt = el.textContent
    el.textContent = ''
    ;[...txt].forEach((c, i) => {
        const s = document.createElement('span')
        s.textContent = c
        s.style.animationDelay = i * 0.08 + 's'
        if (c === ' ') { s.style.display = 'inline-block'; s.style.width = '0.3em' }
        el.appendChild(s)
    })
}

// ── Initialisation ───────────────────────────────────────────
creerDecor()
;['h1','#toDo h2','#inPro h2','#done h2','footer p'].forEach(sel =>
    animeVague(document.querySelector(sel))
)
renderAll()
