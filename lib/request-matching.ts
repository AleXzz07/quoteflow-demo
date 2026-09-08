import type { Client } from "@/lib/quoteflow-types"

export const normalizeMatchText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\b(?:s\s*\.?\s*r\s*\.?\s*l\s*\.?|s\s*\.?\s*p\s*\.?\s*a\s*\.?|s\s*\.?\s*n\s*\.?\s*c\s*\.?|s\s*\.?\s*a\s*\.?\s*s\s*\.?)\b/g, "")
  .replace(/[^a-z0-9]/g, "")

const senderDomain = (text: string) => text.match(/(?:^|\n)da:[^\n<]*<?[^\s<>@]+@([^\s<>]+)>?/i)?.[1]?.toLowerCase().replace(/[>,;.]$/, "") ?? ""

export function matchClientFromRequest(text: string, clients: Client[]) {
  const normalizedText = normalizeMatchText(text)
  const normalizedSignature = normalizeMatchText(text.split(/\n/).slice(-8).join("\n"))
  const domain = senderDomain(text)
  const domainMatches = domain ? clients.filter((client) => client.email.split("@")[1]?.toLowerCase() === domain) : []

  const ranked = clients.map((client) => {
    const company = normalizeMatchText(client.company)
    let score = company && normalizedSignature.includes(company) ? 120 : company && normalizedText.includes(company) ? 100 : 0
    if (domainMatches.length === 1 && domainMatches[0].id === client.id) score += 45
    return { client, score }
  }).sort((a, b) => b.score - a.score)

  const best = ranked[0]
  const runnerUp = ranked[1]
  return best && best.score >= 45 && best.score > (runnerUp?.score ?? 0) ? best.client : null
}
