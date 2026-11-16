import { useEffect, useRef, useState } from 'react'
import { verifyPremium, checkPremium, isPremiumConfigured } from './lib/premium.js'

const HOLIDAYS = {
  christmas: {
    name: 'Christmas', emoji: '🎄',
    greeting: (n) => (n ? `Merry Christmas from ${n}!` : 'Merry Christmas!'),
    defaultMessage: 'Wishing you love, treats & belly rubs this Christmas!',
    stickers: ['🎅', '🦌', '❄️', '🎄', '⭐', '⛄'],
    particles: ['❄', '❄', '✦', '❄'],
    month: 11, day: 25,
  },
  halloween: {
    name: 'Halloween', emoji: '🎃',
    greeting: (n) => (n ? `Happy Halloween from ${n}!` : 'Happy Halloween!'),
    defaultMessage: 'Have a spooky, treat-filled Halloween!',
    stickers: ['🎃', '👻', '🦇', '🕷️', '🍬', '🌙'],
    particles: ['🦇', '🎃', '✦', '👻'],
    month: 9, day: 31,
  },
  valentines: {
    name: "Valentine's Day", emoji: '❤️',
    greeting: (n) => (n ? `Happy Valentine's Day from ${n}!` : "Happy Valentine's Day!"),
    defaultMessage: 'Sending you love, licks & cuddles!',
    stickers: ['❤️', '💕', '💘', '🌹', '💝', '😘'],
    particles: ['❤', '💕', '✦', '❤'],
    month: 1, day: 14,
  },
  easter: {
    name: 'Easter', emoji: '🐰',
    greeting: (n) => (n ? `Happy Easter from ${n}!` : 'Happy Easter!'),
    defaultMessage: 'Hoppy Easter! Wishing you treats and sunshine!',
    stickers: ['🐰', '🥚', '🌷', '🐣', '🌸', '☀️'],
    particles: ['🌸', '🥚', '✦', '🌷'],
    easterDates: ['2027-03-28', '2028-04-16', '2029-04-01', '2030-04-21', '2031-04-13', '2032-03-28'],
  },
  birthday: {
    name: 'Birthday / Gotcha Day', emoji: '🎂',
    greeting: (n) => (n ? `Happy Birthday, ${n}!` : 'Happy Birthday!'),
    defaultMessage: 'Another year of treats, naps & belly rubs!',
    stickers: ['🎂', '🎈', '🎉', '🎁', '🥳', '⭐'],
    particles: ['🎉', '✦', '🎈', '⭐'],
    month: null, day: null,
  },
}

const DESIGNS = {
  'christmas-classic': { holiday: 'christmas', name: 'Classic Red', bg: ['#A41623', '#7F1D1D'], border: '#D4A017', accent: '#FFFFFF', premium: false, emoji: '🎄' },
  'christmas-snowy': { holiday: 'christmas', name: 'Snowy Night', bg: ['#1B2A4A', '#0F1B2D'], border: '#FFFFFF', accent: '#DBEAFE', premium: false, emoji: '❄️' },
  'christmas-wonderland': { holiday: 'christmas', name: 'Winter Wonderland', bg: ['#2A9D8F', '#8FC1B5'], border: '#FFFFFF', accent: '#FFFFFF', premium: true, emoji: '⛄' },
  'christmas-gold': { holiday: 'christmas', name: 'Gold & Green', bg: ['#14532D', '#052E16'], border: '#D4A017', accent: '#FDE68A', premium: true, emoji: '⭐' },
  'halloween-spooky': { holiday: 'halloween', name: 'Spooky Orange', bg: ['#EA580C', '#7C2D12'], border: '#A855F7', accent: '#FFFFFF', premium: false, emoji: '🎃' },
  'halloween-midnight': { holiday: 'halloween', name: 'Midnight Haunt', bg: ['#3B0764', '#1E1B4B'], border: '#FB923C', accent: '#E9D5FF', premium: true, emoji: '👻' },
  'valentines-hearts': { holiday: 'valentines', name: 'Sweet Hearts', bg: ['#DB2777', '#9D174D'], border: '#FBCFE8', accent: '#FFFFFF', premium: false, emoji: '❤️' },
  'valentines-rose': { holiday: 'valentines', name: 'Deep Rose', bg: ['#881337', '#4C0519'], border: '#FDA4AF', accent: '#FFE4E6', premium: true, emoji: '🌹' },
  'easter-pastel': { holiday: 'easter', name: 'Spring Pastel', bg: ['#A78BFA', '#6EE7B7'], border: '#FFFFFF', accent: '#FFFFFF', premium: false, emoji: '🐰' },
  'easter-bunny': { holiday: 'easter', name: 'Bunny Garden', bg: ['#059669', '#A7F3D0'], border: '#FDE68A', accent: '#FFFFFF', premium: true, emoji: '🌷' },
  'birthday-party': { holiday: 'birthday', name: 'Party Time', bg: ['#2563EB', '#7C3AED'], border: '#FDE047', accent: '#FFFFFF', premium: false, emoji: '🎂' },
  'birthday-balloons': { holiday: 'birthday', name: 'Balloons & Cake', bg: ['#DB2777', '#F59E0B'], border: '#FFFFFF', accent: '#FFF7ED', premium: true, emoji: '🎈' },
}

const SIZES = {
  square: { name: 'Square · 1080×1080', w: 1080, h: 1080, ratio: '1 / 1', premium: false, note: 'Instagram post' },
  portrait: { name: 'Portrait · 1080×1350', w: 1080, h: 1350, ratio: '4 / 5', premium: true, note: 'Instagram portrait' },
  landscape: { name: 'Landscape · 1200×630', w: 1200, h: 630, ratio: '120 / 63', premium: true, note: 'Facebook / X' },
}

const FREE_DAILY_LIMIT = 5
const CARDS_KEY = 'merrypaws_cards'
const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || ''
const PREMIUM_PRICE = '$2.99 once'

function daysUntil(month, day) {
  const now = new Date()
  let target = new Date(now.getFullYear(), month, day)
  if (now > target) target = new Date(now.getFullYear() + 1, month, day)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function daysUntilHoliday(holidayKey) {
  const h = HOLIDAYS[holidayKey]
  if (h.easterDates) {
    const now = new Date()
    for (const d of h.easterDates) {
      const target = new Date(`${d}T00:00:00`)
      if (target > now) return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
    }
    return null
  }
  if (h.month === null || h.month === undefined) return null
  return daysUntil(h.month, h.day)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function cardsUsedToday() {
  try {
    const raw = JSON.parse(localStorage.getItem(CARDS_KEY) || '{}')
    return raw.date === todayKey() ? (raw.count || 0) : 0
  } catch {
    return 0
  }
}

function recordCardDownload() {
  const raw = { date: todayKey(), count: cardsUsedToday() + 1 }
  try { localStorage.setItem(CARDS_KEY, JSON.stringify(raw)) } catch { /* ignore */ }
  return raw.count
}

function drawPhotoCover(ctx, img, x, y, w, h, zoom, pan) {
  const ir = img.width / img.height
  const cr = w / h
  let dw, dh
  if (ir > cr) { dh = h; dw = h * ir } else { dw = w; dh = w / ir }
  dw *= zoom; dh *= zoom
  const dx = x + (w - dw) / 2 + pan.x * w
  const dy = y + (h - dh) / 2 + pan.y * h
  ctx.drawImage(img, dx, dy, dw, dh)
}

function drawPhotoContain(ctx, img, x, y, w, h, zoom, pan) {
  const ir = img.width / img.height
  const cr = w / h
  let dw, dh
  if (ir > cr) { dw = w; dh = w / ir } else { dh = h; dw = h * ir }
  dw *= zoom; dh *= zoom
  const dx = x + (w - dw) / 2 + pan.x * w
  const dy = y + (h - dh) / 2 + pan.y * h
  ctx.drawImage(img, dx, dy, dw, dh)
}

const FAQS = [
  { q: 'Is Merry Paws really free?', a: 'Yes — making cards is free. You get a design for every holiday, the square size, and 5 card downloads a day. Premium is a one-time $2.99 and unlocks every design, all sizes, unlimited downloads, and removes the small "Made with Merry Paws" line.' },
  { q: 'Which holidays are covered?', a: 'Christmas, Halloween, Valentine\'s Day, Easter, and birthdays / gotcha days — each with its own designs, greetings, and stickers. Pick the holiday at the top and the whole card switches over.' },
  { q: 'Does my pet photo leave my device?', a: 'No. Your photo is processed right in your browser and never uploaded anywhere. Nothing you make is stored on a server.' },
  { q: 'What size should I download?', a: 'Square (1080×1080) is best for an Instagram post. Portrait (1080×1350) fills more of the feed. Landscape (1200×630) is best for Facebook and X.' },
  { q: 'Can I print the card?', a: 'Yes — the download is a full-resolution PNG, so it prints cleanly at home or at a print shop. Square prints nicely at 5×5 or 6×6 inches.' },
  { q: 'How does Premium work?', a: 'Tap Get Premium and pay $2.99 once. You come straight back to the app and Premium unlocks in this browser. There is no subscription and no account to create.' },
]

export default function App() {
  const [photo, setPhoto] = useState(null) // data URL
  const [photoName, setPhotoName] = useState('')
  const [holidayKey, setHolidayKey] = useState('christmas')
  const [designKey, setDesignKey] = useState('christmas-classic')
  const [sizeKey, setSizeKey] = useState('square')
  const [fitMode, setFitMode] = useState('fit')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [petName, setPetName] = useState('')
  const [message, setMessage] = useState(HOLIDAYS.christmas.defaultMessage)
  const [textPos, setTextPos] = useState('bottom')
  const [textColor, setTextColor] = useState('white')
  const [stickers, setStickers] = useState(['🎅'])
  const [premium, setPremium] = useState(false)
  const [usedToday, setUsedToday] = useState(() => cardsUsedToday())
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef(null)
  const dragRef = useRef(null)

  const holiday = HOLIDAYS[holidayKey]
  const design = DESIGNS[designKey]
  const size = SIZES[sizeKey]
  const daysLeft = daysUntilHoliday(holidayKey)
  const holidayDesigns = Object.entries(DESIGNS).filter(([, d]) => d.holiday === holidayKey)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (sessionId) {
        const ok = await verifyPremium(sessionId)
        if (!cancelled && ok) {
          setPremium(true)
          showToast('Welcome to Premium! Every design and size unlocked. 🎄')
          window.history.replaceState({}, '', window.location.pathname)
          return
        }
        if (!cancelled) showToast('Payment received — Premium is still confirming. Reload in a moment.')
      }
      const has = await checkPremium()
      if (!cancelled && has) setPremium(true)
    }
    init()
    return () => { cancelled = true }
  }, [])

  function showToast(text) {
    setToast(text)
    setTimeout(() => setToast(''), 4500)
  }

  function handleUpgrade() {
    if (!PAYMENT_LINK) {
      showToast('Premium checkout is being set up — check back soon!')
      return
    }
    window.open(PAYMENT_LINK, '_blank')
  }

  function pickHoliday(key) {
    if (key === holidayKey) return
    setHolidayKey(key)
    const firstFree = Object.entries(DESIGNS).find(([, d]) => d.holiday === key && !d.premium)
    setDesignKey(firstFree ? firstFree[0] : Object.keys(DESIGNS).find((k) => DESIGNS[k].holiday === key))
    setMessage(HOLIDAYS[key].defaultMessage)
    setStickers([HOLIDAYS[key].stickers[0]])
  }

  function pickDesign(key) {
    if (DESIGNS[key].premium && !premium) {
      showToast(`${DESIGNS[key].name} is a Premium design — ${PREMIUM_PRICE} unlocks it.`)
      return
    }
    setDesignKey(key)
  }

  function pickSize(key) {
    if (SIZES[key].premium && !premium) {
      showToast(`${SIZES[key].name} is Premium — ${PREMIUM_PRICE} unlocks all sizes.`)
      return
    }
    setSizeKey(key)
  }

  function toggleSticker(emoji) {
    setStickers((prev) => {
      if (prev.includes(emoji)) return prev.filter((s) => s !== emoji)
      if (prev.length >= 3) {
        showToast('Pick up to 3 stickers per card.')
        return prev
      }
      return [...prev, emoji]
    })
  }

  function onPhotoFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhoto(e.target.result)
      setPhotoName(file.name)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  function onPointerDown(e) {
    if (!photo) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragRef.current) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const dx = (e.clientX - dragRef.current.startX) / rect.width
    const dy = (e.clientY - dragRef.current.startY) / rect.height
    setPan({
      x: Math.max(-0.5, Math.min(0.5, dragRef.current.panX + dx)),
      y: Math.max(-0.5, Math.min(0.5, dragRef.current.panY + dy)),
    })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  function headline() {
    return holiday.greeting(petName.trim())
  }

  async function loadPhotoImage() {
    if (!photo) return null
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = photo
    })
  }

  async function downloadCard() {
    if (exporting) return
    if (!premium && usedToday >= FREE_DAILY_LIMIT) {
      showToast(`Free limit reached — 5 cards a day. Premium (${PREMIUM_PRICE}) is unlimited.`)
      return
    }
    setExporting(true)
    try {
      const { w, h } = size
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      // Design background
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, design.bg[0])
      grad.addColorStop(1, design.bg[1])
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Photo area (inside the frame)
      const frame = Math.round(Math.min(w, h) * 0.035)
      const px = frame, py = frame, pw = w - frame * 2, ph = h - frame * 2
      const img = await loadPhotoImage()
      if (img) {
        if (fitMode === 'fit') {
          ctx.save()
          try { ctx.filter = 'blur(28px)' } catch { /* older browsers ignore */ }
          drawPhotoCover(ctx, img, px, py, pw, ph, 1.12, { x: 0, y: 0 })
          ctx.restore()
          ctx.save()
          ctx.beginPath()
          ctx.rect(px, py, pw, ph)
          ctx.clip()
          drawPhotoContain(ctx, img, px, py, pw, ph, zoom, pan)
          ctx.restore()
        } else {
          ctx.save()
          ctx.beginPath()
          ctx.rect(px, py, pw, ph)
          ctx.clip()
          drawPhotoCover(ctx, img, px, py, pw, ph, zoom, pan)
          ctx.restore()
        }
      } else {
        // No photo yet: big festive pup placeholder
        ctx.font = `${Math.round(Math.min(w, h) * 0.42)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🐶', w / 2, h / 2 - h * 0.05)
      }

      // Soft shade behind text for readability
      const textY = textPos === 'top' ? py + ph * 0.10 : py + ph * 0.86
      const shadeH = h * 0.17
      const shadeY = textPos === 'top' ? py : py + ph - shadeH
      const shade = ctx.createLinearGradient(0, shadeY, 0, shadeY + shadeH)
      if (textPos === 'top') {
        shade.addColorStop(0, 'rgba(0,0,0,0.55)')
        shade.addColorStop(1, 'rgba(0,0,0,0)')
      } else {
        shade.addColorStop(0, 'rgba(0,0,0,0)')
        shade.addColorStop(1, 'rgba(0,0,0,0.55)')
      }
      ctx.fillStyle = shade
      ctx.fillRect(px, shadeY, pw, shadeH)

      // Headline + message
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = textColor === 'gold' ? '#FDE68A' : '#FFFFFF'
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = Math.round(w * 0.008)
      const headSize = Math.round(w * (headline().length > 34 ? 0.052 : 0.062))
      ctx.font = `700 ${headSize}px Fredoka, sans-serif`
      ctx.fillText(headline(), w / 2, textY, pw * 0.92)
      const msgSize = Math.round(w * 0.032)
      ctx.font = `600 ${msgSize}px Nunito, sans-serif`
      ctx.fillStyle = '#FFFFFF'
      const msg = message.trim() || 'Wishing you a wonderful day!'
      const words = msg.split(' ')
      const lines = []
      let line = ''
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > pw * 0.86 && line) {
          lines.push(line)
          line = word
        } else {
          line = test
        }
        if (lines.length === 2) break
      }
      if (line) lines.push(line)
      lines.slice(0, 2).forEach((ln, i) => {
        ctx.fillText(ln, w / 2, textY + headSize * 0.85 + i * msgSize * 1.25, pw * 0.9)
      })
      ctx.shadowBlur = 0

      // Stickers at fixed corners
      const stickerSpots = [
        { x: px + pw * 0.08, y: py + ph * 0.09 },
        { x: px + pw * 0.92, y: py + ph * 0.09 },
        { x: px + pw * 0.92, y: py + ph * 0.91 },
      ]
      ctx.font = `${Math.round(Math.min(w, h) * 0.085)}px serif`
      stickers.forEach((s, i) => {
        const spot = stickerSpots[i % stickerSpots.length]
        ctx.fillText(s, spot.x, spot.y)
      })

      // Frame border + corner ornaments
      ctx.strokeStyle = design.border
      ctx.lineWidth = Math.round(Math.min(w, h) * 0.012)
      ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame)
      ctx.font = `${Math.round(Math.min(w, h) * 0.045)}px serif`
      ctx.fillText(design.emoji, frame * 1.1, frame * 1.1)
      ctx.fillText(design.emoji, w - frame * 1.1, frame * 1.1)

      // Free footer
      if (!premium) {
        ctx.font = `600 ${Math.round(w * 0.02)}px Nunito, sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillText('Made with Merry Paws', w / 2, h - frame * 0.9)
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Could not create the card — try another photo.')
          setExporting(false)
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `merry-paws-card-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
        if (!premium) setUsedToday(recordCardDownload())
        const left = FREE_DAILY_LIMIT - cardsUsedToday() - 1
        showToast(premium ? 'Card downloaded! 🎉' : `Card downloaded! ${left < 0 ? 0 : left} free left today.`)
        setExporting(false)
      }, 'image/png')
    } catch {
      showToast('Something went wrong making the card — try again.')
      setExporting(false)
    }
  }

  const particles = Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 7.3) % 100}%`,
    delay: `${(i % 7) * 1.3}s`,
    duration: `${7 + (i % 5) * 2}s`,
    size: 12 + (i % 4) * 5,
    char: holiday.particles[i % holiday.particles.length],
  }))

  return (
    <div className="min-h-screen font-body text-stone-800">
      {/* Header */}
      <header className="bg-[#A41623] text-white shadow">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-none">🐾 Merry Paws</h1>
            <p className="text-red-100 text-sm mt-1">Pet holiday cards for every occasion</p>
          </div>
          <div className="flex items-center gap-3">
            {daysLeft !== null ? (
              <span className="bg-white/15 rounded-full px-3 py-1 text-sm font-semibold">{holiday.emoji} {daysLeft} days until {holiday.name}</span>
            ) : (
              <span className="bg-white/15 rounded-full px-3 py-1 text-sm font-semibold">{holiday.emoji} Birthdays & gotcha days, all year</span>
            )}
            {premium ? (
              <span className="bg-amber-400 text-amber-950 rounded-full px-3 py-1 text-sm font-bold">★ Premium</span>
            ) : (
              <button onClick={handleUpgrade} className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-full px-4 py-2 text-sm shadow">
                Get Premium — {PREMIUM_PRICE}
              </button>
            )}
          </div>
        </div>
        {/* Holiday picker */}
        <div className="mx-auto max-w-6xl px-4 pb-4 flex flex-wrap gap-2">
          {Object.entries(HOLIDAYS).map(([key, h]) => (
            <button
              key={key}
              onClick={() => pickHoliday(key)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${holidayKey === key ? 'bg-white text-[#A41623]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              {h.emoji} {h.name}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg max-w-[92vw] text-center">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 grid lg:grid-cols-2 gap-6 items-start">
        {/* Preview + download */}
        <section>
          <div
            className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl shadow-xl select-none"
            style={{
              aspectRatio: size.ratio,
              background: `linear-gradient(180deg, ${design.bg[0]}, ${design.bg[1]})`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {/* Falling particles */}
            {particles.map((f, i) => (
              <span key={i} className="snowflake" style={{ left: f.left, animationDelay: f.delay, animationDuration: f.duration, fontSize: f.size, color: 'rgba(255,255,255,0.85)' }}>{f.char}</span>
            ))}

            {/* Photo */}
            {photo ? (
              <img
                src={photo}
                alt="Your pet"
                draggable={false}
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: fitMode === 'fit' ? 'contain' : 'cover',
                  transform: `translate(${pan.x * 40}%, ${pan.y * 40}%) scale(${zoom})`,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90">
                <span className="text-[120px] leading-none">🐶</span>
                <p className="font-semibold mt-2">Upload your pet's photo to begin</p>
              </div>
            )}

            {/* Frame */}
            <div className="absolute inset-2 sm:inset-3 rounded-xl pointer-events-none" style={{ border: `3px solid ${design.border}` }} />
            <span className="absolute top-3 left-4 text-xl pointer-events-none">{design.emoji}</span>
            <span className="absolute top-3 right-4 text-xl pointer-events-none">{design.emoji}</span>

            {/* Stickers */}
            <span className="absolute top-10 left-5 text-3xl pointer-events-none">{stickers[0] || ''}</span>
            <span className="absolute top-10 right-5 text-3xl pointer-events-none">{stickers[1] || ''}</span>
            <span className="absolute bottom-12 right-5 text-3xl pointer-events-none">{stickers[2] || ''}</span>

            {/* Text */}
            <div className={`absolute left-0 right-0 px-6 text-center pointer-events-none ${textPos === 'top' ? 'top-14' : 'bottom-10'}`}>
              <p className="font-display font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] text-2xl sm:text-3xl leading-tight" style={{ color: textColor === 'gold' ? '#FDE68A' : '#FFFFFF' }}>
                {headline()}
              </p>
              <p className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] text-sm sm:text-base font-semibold mt-1">{message.trim() || 'Wishing you a wonderful day!'}</p>
            </div>

            {!premium && (
              <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-white/80 pointer-events-none">Made with Merry Paws</p>
            )}
          </div>

          <p className="text-center text-xs text-stone-500 mt-2">
            {photo ? 'Drag the photo to move it · Use the zoom slider below' : 'Your photo stays on your device — nothing is uploaded.'}
          </p>

          <button
            onClick={downloadCard}
            disabled={exporting}
            className="mt-4 w-full bg-[#A41623] hover:bg-[#8C1220] disabled:opacity-60 text-white font-display font-semibold text-lg rounded-xl py-3 shadow"
          >
            {exporting ? 'Making your card…' : `⬇ Download my ${holiday.name} card (PNG)`}
          </button>
          <p className="text-center text-sm text-stone-500 mt-2">
            {premium ? 'Premium · unlimited downloads' : `Free · ${Math.max(0, FREE_DAILY_LIMIT - usedToday)} of ${FREE_DAILY_LIMIT} downloads left today`}
          </p>
          {!premium && (
            <button onClick={handleUpgrade} className="mt-2 w-full border-2 border-amber-500 text-amber-700 font-bold rounded-xl py-2.5 text-sm hover:bg-amber-50">
              ⭐ Get Premium — {PREMIUM_PRICE}: every design, all sizes, unlimited cards, no footer
            </button>
          )}
        </section>

        {/* Controls */}
        <section className="space-y-5">
          {/* Photo */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">1 · Your pet's photo</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileRef.current && fileRef.current.click()} className="bg-stone-900 text-white font-bold rounded-full px-4 py-2 text-sm">
                {photo ? 'Change photo' : '📷 Upload a photo'}
              </button>
              {photo && (
                <button
                  onClick={() => { setPhoto(null); setPhotoName(''); setZoom(1); setPan({ x: 0, y: 0 }) }}
                  className="border border-stone-300 font-bold rounded-full px-4 py-2 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoFile(e.target.files && e.target.files[0])} />
            {photoName && <p className="text-xs text-stone-500 mt-2 truncate">{photoName}</p>}
            {photo && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setFitMode('fit')} className={`flex-1 rounded-full py-2 text-sm font-bold ${fitMode === 'fit' ? 'bg-[#A41623] text-white' : 'border border-stone-300'}`}>Fit · whole photo</button>
                  <button onClick={() => setFitMode('fill')} className={`flex-1 rounded-full py-2 text-sm font-bold ${fitMode === 'fill' ? 'bg-[#A41623] text-white' : 'border border-stone-300'}`}>Fill · crop to card</button>
                </div>
                <label className="block text-sm font-semibold">Zoom <span className="font-normal text-stone-500">{zoom.toFixed(1)}×</span>
                  <input type="range" min="1" max="2.2" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full" />
                </label>
              </div>
            )}
          </div>

          {/* Design */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">2 · Pick a design <span className="text-sm font-body font-normal text-stone-500">· {holiday.name}</span></h2>
            <div className="grid grid-cols-2 gap-2">
              {holidayDesigns.map(([key, d]) => (
                <button
                  key={key}
                  onClick={() => pickDesign(key)}
                  className={`rounded-xl p-3 text-left text-white font-display font-semibold shadow ${designKey === key ? 'ring-4 ring-amber-400' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${d.bg[0]}, ${d.bg[1]})` }}
                >
                  <span className="text-xl">{d.emoji}</span> {d.name}
                  {d.premium && !premium && <span className="block text-xs font-body font-bold opacity-90 mt-1">🔒 Premium</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">3 · Card size</h2>
            <div className="space-y-2">
              {Object.entries(SIZES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => pickSize(key)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 px-3 py-2 text-sm font-bold ${sizeKey === key ? 'border-[#A41623] bg-red-50' : 'border-stone-200'}`}
                >
                  <span>{s.name} <span className="font-normal text-stone-500">· {s.note}</span></span>
                  {s.premium && !premium && <span className="text-amber-600">🔒 Premium</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Words */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">4 · Words on the card</h2>
            <label className="block text-sm font-semibold mb-1">Your pet's name
              <input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Biscuit" maxLength={24} className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 font-normal" />
            </label>
            <label className="block text-sm font-semibold mb-1 mt-3">Message
              <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={90} className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 font-normal" />
            </label>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => setTextPos('top')} className={`rounded-full px-3 py-1.5 text-sm font-bold ${textPos === 'top' ? 'bg-stone-900 text-white' : 'border border-stone-300'}`}>Text at top</button>
              <button onClick={() => setTextPos('bottom')} className={`rounded-full px-3 py-1.5 text-sm font-bold ${textPos === 'bottom' ? 'bg-stone-900 text-white' : 'border border-stone-300'}`}>Text at bottom</button>
              <button onClick={() => setTextColor('white')} className={`rounded-full px-3 py-1.5 text-sm font-bold ${textColor === 'white' ? 'bg-stone-900 text-white' : 'border border-stone-300'}`}>White text</button>
              <button onClick={() => setTextColor('gold')} className={`rounded-full px-3 py-1.5 text-sm font-bold ${textColor === 'gold' ? 'bg-amber-500 text-white' : 'border border-stone-300'}`}>Gold text</button>
            </div>
          </div>

          {/* Stickers */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">5 · Stickers <span className="text-sm font-body font-normal text-stone-500">(pick up to 3)</span></h2>
            <div className="flex flex-wrap gap-2">
              {holiday.stickers.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSticker(s)}
                  className={`text-3xl rounded-xl w-14 h-14 ${stickers.includes(s) ? 'bg-red-100 ring-2 ring-[#A41623]' : 'bg-stone-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Free vs Premium */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">Free vs Premium</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-xl p-3">
                <p className="font-bold">Free</p>
                <ul className="mt-1 space-y-1 text-stone-600">
                  <li>✓ A design for every holiday</li>
                  <li>✓ Square size</li>
                  <li>✓ 5 cards a day</li>
                  <li>✓ Stickers & text</li>
                </ul>
              </div>
              <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-3">
                <p className="font-bold">Premium · {PREMIUM_PRICE}</p>
                <ul className="mt-1 space-y-1 text-stone-600">
                  <li>✓ All 12 designs</li>
                  <li>✓ All 3 sizes</li>
                  <li>✓ Unlimited cards</li>
                  <li>✓ No footer on cards</li>
                </ul>
                {!premium && (
                  <button onClick={handleUpgrade} className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full py-1.5 text-sm">
                    Get Premium
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-stone-500 mt-2">One-time payment, no subscription. {isPremiumConfigured() ? '' : 'Premium checkout is being set up.'}</p>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-display font-semibold text-lg mb-2">Questions</h2>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="text-sm">
                  <summary className="font-bold cursor-pointer">{f.q}</summary>
                  <p className="text-stone-600 mt-1">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-stone-500 pb-8 px-4">
        Merry Paws · Pet holiday cards for Christmas, Halloween, Valentine's Day, Easter & birthdays · Your photo never leaves your device.
      </footer>
    </div>
  )
}
