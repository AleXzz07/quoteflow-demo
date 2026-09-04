export type QuoteStatus = "Bozza" | "Inviato" | "Accettato" | "Rifiutato"

export type Client = {
  id: string
  company: string
  contact: string
  email: string
  phone: string
  city: string
  vatNumber: string
}

export type QuoteLine = {
  id: string
  description: string
  quantity: number
  unit: string
  material: string
  processes: string
  materialCost: number
  machineHours: number
  machineRate: number
  laborHours: number
  laborRate: number
  externalCost: number
  extraCost: number
}

export type Quote = {
  id: string
  number: string
  date: string
  validUntil: string
  clientId: string
  title: string
  description: string
  status: QuoteStatus
  markup: number
  vat: number
  notes: string
  lines: QuoteLine[]
}

export type MaterialRate = {
  id: string
  name: string
  category: string
  unit: string
  price: number
}

export type ProcessRate = {
  id: string
  name: string
  category: "Macchina" | "Manodopera" | "Esterna"
  unit: string
  price: number
}

export type CompanySettings = {
  companyName: string
  legalName: string
  logoDataUrl: string
  vatNumber: string
  address: string
  city: string
  email: string
  phone: string
  defaultMarkup: number
  minimumMargin: number
  defaultVat: number
  defaultMachineRate: number
  defaultLaborRate: number
  validityDays: number
  paymentTerms: string
  conditions: string
}

export type QuoteFlowState = {
  clients: Client[]
  quotes: Quote[]
  materials: MaterialRate[]
  processes: ProcessRate[]
  settings: CompanySettings
}

export type QuoteTotals = {
  material: number
  machine: number
  labor: number
  external: number
  extra: number
  cost: number
  sale: number
  marginValue: number
  marginPercent: number
  vatValue: number
  customerTotal: number
}

export const calculateQuote = (quote: Pick<Quote, "lines" | "markup" | "vat">): QuoteTotals => {
  const material = quote.lines.reduce((sum, line) => sum + Number(line.materialCost || 0), 0)
  const machine = quote.lines.reduce(
    (sum, line) => sum + Number(line.machineHours || 0) * Number(line.machineRate || 0),
    0,
  )
  const labor = quote.lines.reduce(
    (sum, line) => sum + Number(line.laborHours || 0) * Number(line.laborRate || 0),
    0,
  )
  const external = quote.lines.reduce((sum, line) => sum + Number(line.externalCost || 0), 0)
  const extra = quote.lines.reduce((sum, line) => sum + Number(line.extraCost || 0), 0)
  const cost = material + machine + labor + external + extra
  const sale = cost * (1 + Number(quote.markup || 0) / 100)
  const marginValue = sale - cost
  const marginPercent = sale > 0 ? (marginValue / sale) * 100 : 0
  const vatValue = sale * (Number(quote.vat || 0) / 100)

  return {
    material,
    machine,
    labor,
    external,
    extra,
    cost,
    sale,
    marginValue,
    marginPercent,
    vatValue,
    customerTotal: sale + vatValue,
  }
}

export const suggestedPriceForMargin = (cost: number, minimumMargin: number) =>
  minimumMargin >= 100 ? cost : cost / (1 - minimumMargin / 100)
