const API_BASE = import.meta.env.VITE_API_URL || "/api"

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Upload failed")
  }

  return res.json()
}

export async function askQuestion(question, useHybrid = true, topK = 5) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, use_hybrid: useHybrid, top_k: topK }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Request failed")
  }

  return res.json()
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Failed to fetch stats")
  }
  return res.json()
}