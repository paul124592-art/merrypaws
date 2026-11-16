// Server-verified Premium for Merry Paws.
// No localStorage flag is ever trusted: Premium is true only after the
// Supabase edge function confirms the Stripe checkout session or a
// stored session token with the server. Mirrors the SantaList pattern.

const TOKEN_KEY = 'merrypaws_premium_token'
const PRODUCT = 'merrypaws'

function supabaseUrl() {
  return import.meta.env.VITE_SUPABASE_URL
}

function anonKey() {
  return import.meta.env.VITE_SUPABASE_ANON_KEY
}

function premiumConfigured() {
  return Boolean(supabaseUrl() && anonKey())
}

async function callPremium(action, body) {
  const url = `${supabaseUrl()}/functions/v1/premium`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${anonKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  })
  return res.json()
}

export function isPremiumConfigured() {
  return premiumConfigured()
}

// Verify a Stripe checkout session id (from ?session_id= after payment).
// Returns true only when the server confirms a paid merrypaws order.
export async function verifyPremium(sessionId) {
  if (!premiumConfigured() || !sessionId) return false
  try {
    const data = await callPremium('verify', { session_id: sessionId })
    if (data && data.premium && data.product === PRODUCT) {
      localStorage.setItem(TOKEN_KEY, sessionId)
      return true
    }
    return false
  } catch {
    return false
  }
}

// Check a stored session token with the server on every load.
export async function checkPremium() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || !premiumConfigured()) return false
  try {
    const data = await callPremium('check', { token })
    if (data && data.premium && data.product === PRODUCT) return true
    localStorage.removeItem(TOKEN_KEY)
    return false
  } catch {
    return false
  }
}

export function clearPremium() {
  localStorage.removeItem(TOKEN_KEY)
}
