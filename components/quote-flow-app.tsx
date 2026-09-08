"use client"
/* eslint-disable @next/next/no-img-element -- customer logos are local data URLs */

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  CircleEuro,
  ClipboardList,
  Copy,
  Download,
  Factory,
  FileDown,
  FilePlus2,
  FileText,
  FilterX,
  LayoutDashboard,
  ListChecks,
  Mail,
  PackageSearch,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

import { DEMO_STATE } from "@/lib/demo-data"
import { matchClientFromRequest, normalizeMatchText } from "@/lib/request-matching"
import {
  calculateQuote,
  suggestedPriceForMargin,
  type Client,
  type MaterialRate,
  type ProcessCategory,
  type ProcessRate,
  type Quote,
  type QuoteFlowState,
  type QuoteLine,
  type QuoteOperation,
  type QuoteStatus,
} from "@/lib/quoteflow-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/sonner"

type View = "dashboard" | "quotes" | "editor" | "clients" | "catalogs" | "settings"

const STORAGE_KEY = "quoteflow-demo-v2"
const CONTACT_EMAIL = "alessandrotedeschi2007@gmail.com"
const CONTACT_SUBJECT = "Richiesta versione personalizzata QuoteFlow"
const CONTACT_BODY = "Ciao, ho visto la demo di QuoteFlow e vorrei avere maggiori informazioni su una versione personalizzata per la mia azienda."
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}&body=${encodeURIComponent(CONTACT_BODY)}`
const CONTACT_GMAIL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(CONTACT_SUBJECT)}&body=${encodeURIComponent(CONTACT_BODY)}`
const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" })
const number = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 })

const cloneDemo = (): QuoteFlowState => JSON.parse(JSON.stringify(DEMO_STATE)) as QuoteFlowState
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const statusTone: Record<QuoteStatus, string> = {
  Bozza: "border-slate-200 bg-slate-100 text-slate-700",
  Inviato: "border-blue-200 bg-blue-50 text-blue-700",
  Accettato: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rifiutato: "border-rose-200 bg-rose-50 text-rose-700",
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant="outline" className={`font-medium ${statusTone[status]}`}>{status}</Badge>
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <PackageSearch className="mb-3 size-8 text-slate-400" />
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  )
}

function newLine(settings: QuoteFlowState["settings"]): QuoteLine {
  return {
    id: uid(),
    description: "",
    quantity: 1,
    unit: "pz",
    material: "S235JR",
    processes: "",
    operations: [],
    materialCost: 0,
    machineHours: 0,
    machineRate: settings.defaultMachineRate,
    laborHours: 0,
    laborRate: settings.defaultLaborRate,
    externalCost: 0,
    extraCost: 0,
  }
}

function newOperation(): QuoteOperation {
  return { id: uid(), processId: "", name: "", category: "Macchina", unit: "€/h", quantity: 1, rate: 0 }
}

function newQuote(state: QuoteFlowState): Quote {
  const now = new Date()
  const valid = new Date(now)
  valid.setDate(valid.getDate() + state.settings.validityDays)
  const next = Math.max(184, ...state.quotes.map((quote) => Number(quote.number.split("-").at(-1)) || 0)) + 1
  return {
    id: uid(),
    number: `PRV-${now.getFullYear()}-${String(next).padStart(4, "0")}`,
    date: now.toISOString().slice(0, 10),
    validUntil: valid.toISOString().slice(0, 10),
    clientId: state.clients[0]?.id ?? "",
    title: "",
    description: "",
    status: "Bozza",
    markup: state.settings.defaultMarkup,
    vat: state.settings.defaultVat,
    notes: "",
    lines: [newLine(state.settings)],
  }
}

function emptyClient(): Client {
  return { id: uid(), company: "", contact: "", email: "", phone: "", city: "", vatNumber: "" }
}

const operationCost = (operation: QuoteOperation) => Number(operation.quantity || 0) * Number(operation.rate || 0)
const lineProcessSummary = (line: QuoteLine) => Array.isArray(line.operations) ? line.operations.map((operation) => operation.name).filter(Boolean).join(", ") : line.processes
const operationQuantityLabel = (unit: string) => unit.toLowerCase().includes("/h") ? "Ore" : unit.toLowerCase().includes("lotto") ? "Lotti" : "Quantità"

const legacyOperations = (line: QuoteLine): QuoteOperation[] => {
  if (Array.isArray(line.operations)) return line.operations
  const operations: QuoteOperation[] = []
  if (line.machineHours) operations.push({ id: uid(), processId: "", name: "Lavorazioni macchina", category: "Macchina", unit: "€/h", quantity: line.machineHours, rate: line.machineRate })
  if (line.laborHours) operations.push({ id: uid(), processId: "", name: "Manodopera", category: "Manodopera", unit: "€/h", quantity: line.laborHours, rate: line.laborRate })
  if (line.externalCost) operations.push({ id: uid(), processId: "", name: "Lavorazioni esterne", category: "Esterna", unit: "€/lotto", quantity: 1, rate: line.externalCost })
  return operations
}

const normalizeState = (value: QuoteFlowState): QuoteFlowState => ({
  ...value,
  quotes: value.quotes.map((quote) => ({ ...quote, lines: quote.lines.map((line) => ({ ...line, operations: legacyOperations(line) })) })),
})

export default function QuoteFlowApp() {
  const [state, setState] = useState<QuoteFlowState>(() => cloneDemo())
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<View>("dashboard")
  const [editorQuote, setEditorQuote] = useState<Quote | null>(null)
  const [editorBaseline, setEditorBaseline] = useState("")
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [pdfQuote, setPdfQuote] = useState<Quote | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<View | "new" | null>(null)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [clientDialog, setClientDialog] = useState<{ open: boolean; client: Client | null; selectAfterSave: boolean }>({ open: false, client: null, selectAfterSave: false })

  useEffect(() => {
    const task = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as QuoteFlowState
          setState(normalizeState({ ...parsed, settings: { ...DEMO_STATE.settings, ...parsed.settings } }))
        }
      } catch {
        toast.error("I dati locali non sono stati caricati")
      } finally {
        setHydrated(true)
      }
    }, 0)
    return () => window.clearTimeout(task)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const editorDirty = Boolean(editorQuote && editorBaseline && JSON.stringify(editorQuote) !== editorBaseline)

  useEffect(() => {
    if (!editorDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [editorDirty])

  const navigate = (next: View) => {
    setView(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startNewQuoteImmediate = () => {
    const quote = newQuote(state)
    setEditorQuote(quote)
    setEditorBaseline(JSON.stringify(quote))
    navigate("editor")
  }

  const requestNavigate = (next: View) => {
    if (view === "editor" && editorDirty && next !== "editor") {
      setPendingNavigation(next)
      return
    }
    navigate(next)
  }

  const startNewQuote = () => {
    if (view === "editor" && editorDirty) {
      setPendingNavigation("new")
      return
    }
    startNewQuoteImmediate()
  }

  const editQuote = (quote: Quote) => {
    setSelectedQuote(null)
    const draft = JSON.parse(JSON.stringify(quote)) as Quote
    setEditorQuote(draft)
    setEditorBaseline(JSON.stringify(draft))
    navigate("editor")
  }

  const saveQuote = (quote: Quote) => {
    const existing = state.quotes.some((item) => item.id === quote.id)
    setState((current) => ({
      ...current,
      quotes: existing
        ? current.quotes.map((item) => (item.id === quote.id ? quote : item))
        : [quote, ...current.quotes],
    }))
    toast.success(existing ? "Preventivo aggiornato" : "Preventivo salvato")
    setEditorQuote(null)
    setEditorBaseline("")
    navigate("quotes")
  }

  const duplicateQuote = (source: Quote) => {
    const duplicate = newQuote(state)
    duplicate.clientId = source.clientId
    duplicate.title = `${source.title} (copia)`
    duplicate.description = source.description
    duplicate.markup = source.markup
    duplicate.vat = source.vat
    duplicate.notes = source.notes
    duplicate.lines = source.lines.map((line) => ({ ...line, id: uid(), operations: line.operations.map((operation) => ({ ...operation, id: uid() })) }))
    setSelectedQuote(null)
    setEditorQuote(duplicate)
    setEditorBaseline(JSON.stringify(duplicate))
    navigate("editor")
    toast.success("Preventivo duplicato", { description: "La copia è pronta per essere modificata." })
  }

  const deleteQuote = () => {
    if (!quoteToDelete) return
    setState((current) => ({ ...current, quotes: current.quotes.filter((quote) => quote.id !== quoteToDelete.id) }))
    toast.success("Preventivo eliminato")
    setQuoteToDelete(null)
  }

  const saveClient = (client: Client) => {
    const exists = state.clients.some((item) => item.id === client.id)
    setState((current) => ({
      ...current,
      clients: exists ? current.clients.map((item) => item.id === client.id ? client : item) : [client, ...current.clients],
    }))
    if (clientDialog.selectAfterSave && editorQuote) setEditorQuote({ ...editorQuote, clientId: client.id })
    setClientDialog({ open: false, client: null, selectAfterSave: false })
    toast.success(exists ? "Cliente aggiornato" : "Cliente aggiunto")
  }

  const resetDemo = () => {
    setState(cloneDemo())
    window.localStorage.removeItem(STORAGE_KEY)
    toast.success("Dati dimostrativi ripristinati")
    navigate("dashboard")
  }

  const copyContactEmail = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(CONTACT_EMAIL)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = CONTACT_EMAIL
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        const copied = document.execCommand("copy")
        textarea.remove()
        if (!copied) throw new Error("Copia non disponibile")
      }
      toast.success("Email copiata")
    } catch {
      toast.error("Impossibile copiare l'email")
    }
  }

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "quotes" as const, label: "Preventivi", icon: FileText },
    { id: "clients" as const, label: "Clienti", icon: Users },
    { id: "catalogs" as const, label: "Listini", icon: ListChecks },
    { id: "settings" as const, label: "Impostazioni", icon: Settings },
  ]

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-white/10">
        <SidebarHeader className="bg-[#0b3d45] px-3 py-4 text-white">
          <div className="flex items-center gap-3 overflow-hidden px-1">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#ffb454] font-black text-[#0b3d45]">Q</div>
            <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <p className="truncate text-base font-bold tracking-tight">QuoteFlow</p>
              <p className="truncate text-xs text-cyan-100/70">Preventivi industriali</p>
              <Badge variant="outline" className="mt-2 border-white/20 bg-white/10 text-[11px] font-semibold text-cyan-50">
                Demo commerciale
              </Badge>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-[#0b3d45] px-2 py-4 text-cyan-50">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={view === item.id || (item.id === "quotes" && view === "editor")}
                      onClick={() => requestNavigate(item.id)}
                      className="h-10 cursor-pointer text-cyan-50/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/14 data-[active=true]:font-semibold data-[active=true]:text-white"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="bg-[#0b3d45] p-3 text-white">
          <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2.5">
            {state.settings.logoDataUrl ? <img src={state.settings.logoDataUrl} alt="Logo aziendale" className="size-8 shrink-0 rounded-lg bg-white object-contain p-0.5" /> : <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-900 text-xs font-bold">{initials(state.settings.companyName)}</div>}
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">{state.settings.companyName}</p>
              <p className="truncate text-xs text-cyan-100/60">Ambiente demo</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f4f7f8]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="text-slate-600" />
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <p className="truncate text-sm font-semibold text-slate-700">
              {view === "editor" ? "Nuovo preventivo" : navItems.find((item) => item.id === view)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden border-slate-200 bg-white text-slate-700 sm:flex" onClick={() => setAiOpen(true)}>
              <Sparkles className="text-amber-500" /> Importa richiesta
            </Button>
            <Button onClick={startNewQuote} className="bg-[#0b3d45] text-white shadow-sm hover:bg-[#12525c]">
              <Plus /> <span className="hidden sm:inline">Nuovo preventivo</span><span className="sm:hidden">Nuovo</span>
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 md:px-7 md:pt-6">
          <div className="flex flex-col gap-3 rounded-xl border border-[#b9d7da] bg-gradient-to-r from-[#eaf5f5] to-white px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0b3d45]">
                Vuoi una versione personalizzata per la tua azienda?
              </p>
              <button type="button" onClick={() => setContactOpen(true)} className="mt-1 inline-block cursor-pointer text-left text-xs text-[#14727d] underline-offset-2 hover:underline">
                {CONTACT_EMAIL}
              </button>
            </div>
            <Button type="button" size="sm" onClick={() => setContactOpen(true)} className="w-full bg-[#0b3d45] text-white hover:bg-[#12525c] sm:w-auto" data-demo-contact>
              <Mail /> Contattami
            </Button>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-7 md:pt-5">
          {view === "dashboard" && <Dashboard state={state} onNew={startNewQuote} onOpen={setSelectedQuote} />}
          {view === "quotes" && <QuotesPage state={state} onOpen={setSelectedQuote} onNew={startNewQuote} />}
          {view === "editor" && editorQuote && (
            <QuoteEditor
              quote={editorQuote}
              state={state}
              onChange={setEditorQuote}
              onCancel={() => requestNavigate("quotes")}
              onSave={saveQuote}
              onAi={() => setAiOpen(true)}
              onPreview={() => setPdfQuote(editorQuote)}
              onAddClient={() => setClientDialog({ open: true, client: emptyClient(), selectAfterSave: true })}
            />
          )}
          {view === "clients" && <ClientsPage state={state} onOpenQuote={setSelectedQuote} onAdd={() => setClientDialog({ open: true, client: emptyClient(), selectAfterSave: false })} onEdit={(client) => setClientDialog({ open: true, client, selectAfterSave: false })} />}
          {view === "catalogs" && <CatalogsPage state={state} setState={setState} />}
          {view === "settings" && <SettingsPage state={state} setState={setState} onReset={resetDemo} />}
        </main>
        <footer className="mx-auto w-full max-w-[1600px] px-4 pb-5 text-center text-xs leading-5 text-slate-500 md:px-7 md:pb-7">
          I dati presenti sono dimostrativi e vengono salvati solo localmente nel browser.
        </footer>
      </SidebarInset>

      <QuoteDetailDialog
        quote={selectedQuote}
        state={state}
        onClose={() => setSelectedQuote(null)}
        onEdit={editQuote}
        onDuplicate={duplicateQuote}
        onDelete={(quote) => { setSelectedQuote(null); setQuoteToDelete(quote) }}
        onPdf={(quote) => { setSelectedQuote(null); setPdfQuote(quote) }}
      />
      <PdfPreviewDialog quote={pdfQuote} state={state} onClose={() => setPdfQuote(null)} />
      <AiImportDialog
        open={aiOpen}
        state={state}
        onClose={() => setAiOpen(false)}
        onApply={(draft) => {
          setEditorQuote(draft)
          setEditorBaseline(JSON.stringify(draft))
          setAiOpen(false)
          navigate("editor")
          toast.success("Dati importati nel preventivo", { description: "Verificali prima di salvare." })
        }}
      />
      {clientDialog.open && <ClientFormDialog open client={clientDialog.client} onClose={() => setClientDialog({ open: false, client: null, selectAfterSave: false })} onSave={saveClient} />}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contatta QuoteFlow</DialogTitle>
            <DialogDescription>Scegli come inviare la tua richiesta. L'oggetto e il messaggio sono già pronti.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[#b9d7da] bg-[#f2f8f8] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</p>
            <p className="mt-1 break-all text-sm font-semibold text-[#0b3d45]">{CONTACT_EMAIL}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button type="button" variant="outline" onClick={copyContactEmail}>
              <Copy /> Copia email
            </Button>
            <Button asChild variant="outline">
              <a href={CONTACT_MAILTO}>
                <Mail /> Apri app email
              </a>
            </Button>
            <Button asChild className="bg-[#0b3d45] text-white hover:bg-[#12525c]">
              <a href={CONTACT_GMAIL} target="_blank" rel="noreferrer">
                <Mail /> Apri Gmail
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(quoteToDelete)} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminare il preventivo?</AlertDialogTitle><AlertDialogDescription>{quoteToDelete?.number} verrà rimosso dallo storico locale. Questa operazione non può essere annullata.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={deleteQuote} className="bg-rose-600 text-white hover:bg-rose-700">Elimina</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(pendingNavigation)} onOpenChange={(open) => !open && setPendingNavigation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Modifiche non salvate</AlertDialogTitle><AlertDialogDescription>Se esci ora perderai le modifiche apportate al preventivo.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Resta qui</AlertDialogCancel><AlertDialogAction onClick={() => { const target = pendingNavigation; setPendingNavigation(null); setEditorQuote(null); setEditorBaseline(""); if (target === "new") startNewQuoteImmediate(); else if (target) navigate(target) }} className="bg-[#0b3d45] text-white hover:bg-[#12525c]">Esci senza salvare</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#14727d]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

function Dashboard({ state, onNew, onOpen }: { state: QuoteFlowState; onNew: () => void; onOpen: (quote: Quote) => void }) {
  const quoteRows = state.quotes.map((quote) => ({ quote, totals: calculateQuote(quote) }))
  const totalValue = quoteRows.reduce((sum, row) => sum + row.totals.sale, 0)
  const averageMargin = quoteRows.length ? quoteRows.reduce((sum, row) => sum + row.totals.marginPercent, 0) / quoteRows.length : 0
  const accepted = state.quotes.filter((quote) => quote.status === "Accettato").length
  const atRisk = quoteRows.filter((row) => row.totals.marginPercent < state.settings.minimumMargin)
  const latestTimestamp = state.quotes.length
    ? Math.max(...state.quotes.map((quote) => new Date(`${quote.date}T12:00:00`).getTime()))
    : new Date("2026-09-01T12:00:00").getTime()
  const latestMonth = new Date(latestTimestamp)
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(latestMonth.getFullYear(), latestMonth.getMonth() - (5 - index), 1)
    const year = date.getFullYear()
    const monthIndex = date.getMonth()
    const value = quoteRows
      .filter(({ quote }) => { const quoteDate = new Date(`${quote.date}T12:00:00`); return quoteDate.getFullYear() === year && quoteDate.getMonth() === monthIndex })
      .reduce((sum, row) => sum + row.totals.sale, 0)
    return { month: new Intl.DateTimeFormat("it-IT", { month: "short" }).format(date).replace(".", ""), value }
  })
  const currentMonthValue = chartData.at(-1)?.value ?? 0
  const previousMonthValue = chartData.at(-2)?.value ?? 0
  const monthlyGrowth = previousMonthValue > 0 ? ((currentMonthValue - previousMonthValue) / previousMonthValue) * 100 : currentMonthValue > 0 ? 100 : 0
  const latestQuoteDate = new Date(latestTimestamp)
  const sixtyDaysAgo = new Date(latestQuoteDate)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const recentCount = state.quotes.filter((quote) => new Date(`${quote.date}T12:00:00`) >= sixtyDaysAgo).length

  return (
    <>
      <PageHeading
        eyebrow="Panoramica commerciale"
        title={`Buongiorno, ${state.settings.companyName}`}
        description="Controlla il portafoglio preventivi e intervieni subito sulle offerte meno redditizie."
        action={<Button onClick={onNew} className="bg-[#0b3d45] hover:bg-[#12525c]"><FilePlus2 /> Crea preventivo</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Preventivi" value={String(state.quotes.length)} detail={`${recentCount} negli ultimi 60 giorni`} icon={ClipboardList} />
        <MetricCard label="Valore preventivato" value={money.format(totalValue)} detail="IVA esclusa" icon={CircleEuro} />
        <MetricCard label="Margine medio" value={`${number.format(averageMargin)}%`} detail={`Obiettivo minimo ${state.settings.minimumMargin}%`} icon={TrendingUp} />
        <MetricCard label="Accettati" value={String(accepted)} detail={`${number.format((accepted / state.quotes.length) * 100)}% del totale`} icon={Check} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div><CardTitle className="text-base">Valore preventivato</CardTitle><CardDescription>Ultimi sei mesi, IVA esclusa</CardDescription></div>
            <Badge variant="outline" className={monthlyGrowth >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>{monthlyGrowth >= 0 ? "+" : ""}{number.format(monthlyGrowth)}%</Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: "Valore", color: "#14727d" } }} className="h-[245px] w-full aspect-auto">
              <BarChart data={chartData} margin={{ left: 0, right: 8, top: 18, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis width={58} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000000 ? `${number.format(value / 1000000)}M` : `${number.format(value / 1000)}k`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => <span className="font-mono font-semibold">{money.format(Number(value))}</span>} />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[5, 5, 0, 0]} maxBarSize={46} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-500" /> Margini da controllare</CardTitle>
            <CardDescription>Sotto la soglia aziendale del {state.settings.minimumMargin}%</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {atRisk.length ? atRisk.map(({ quote, totals }) => (
              <button key={quote.id} onClick={() => onOpen(quote)} className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-amber-50/60 last:border-0">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{quote.title}</p><p className="mt-0.5 text-xs text-slate-500">{quote.number}</p></div>
                <div className="flex items-center gap-2"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{number.format(totals.marginPercent)}%</Badge><ChevronRight className="size-4 text-slate-400" /></div>
              </button>
            )) : <div className="p-5 text-sm text-slate-500">Nessun margine critico.</div>}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4 border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div><CardTitle className="text-base">Preventivi recenti</CardTitle><CardDescription>Le ultime attività commerciali</CardDescription></div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <QuotesTable quotes={state.quotes.slice(0, 6)} state={state} onOpen={onOpen} />
        </CardContent>
      </Card>
    </>
  )
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof ClipboardList }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="grid size-9 place-items-center rounded-lg bg-[#e6f1f2] text-[#0f6570]"><Icon className="size-4" /></div>
        </div>
        <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  )
}

function QuotesPage({ state, onOpen, onNew }: { state: QuoteFlowState; onOpen: (quote: Quote) => void; onNew: () => void }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("Tutti")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")

  const filtered = useMemo(() => state.quotes.filter((quote) => {
    const client = state.clients.find((item) => item.id === quote.clientId)
    const haystack = `${quote.number} ${quote.title} ${client?.company ?? ""}`.toLowerCase()
    const total = calculateQuote(quote).sale
    return (!search || haystack.includes(search.toLowerCase()))
      && (status === "Tutti" || quote.status === status)
      && (!dateFrom || quote.date >= dateFrom)
      && (!dateTo || quote.date <= dateTo)
      && (!amountMin || total >= Number(amountMin))
      && (!amountMax || total <= Number(amountMax))
  }), [state, search, status, dateFrom, dateTo, amountMin, amountMax])

  const clearFilters = () => { setSearch(""); setStatus("Tutti"); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax("") }

  return (
    <>
      <PageHeading title="Preventivi" description="Cerca, filtra e consulta tutte le offerte commerciali." action={<Button onClick={onNew} className="bg-[#0b3d45] hover:bg-[#12525c]"><Plus /> Nuovo preventivo</Button>} />
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr_1fr_1fr_0.75fr_0.75fr_auto]">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Numero, cliente o commessa…" className="pl-9" /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Tutti", "Bozza", "Inviato", "Accettato", "Rifiutato"].map((item) => <SelectItem key={item} value={item}>{item === "Tutti" ? "Tutti gli stati" : item}</SelectItem>)}</SelectContent></Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Data da" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Data a" />
            <Input type="number" min="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Min €" aria-label="Importo minimo" />
            <Input type="number" min="0" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Max €" aria-label="Importo massimo" />
            <Button variant="ghost" onClick={clearFilters} className="text-slate-500"><FilterX /> Azzera</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">{filtered.length} risultati su {state.quotes.length}</p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length ? <QuotesTable quotes={filtered} state={state} onOpen={onOpen} /> : <div className="p-6"><EmptyState title="Nessun preventivo trovato" description="Modifica i filtri o crea un nuovo preventivo." /></div>}
        </CardContent>
      </Card>
    </>
  )
}

function QuotesTable({ quotes, state, onOpen }: { quotes: Quote[]; state: QuoteFlowState; onOpen: (quote: Quote) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow className="bg-slate-50/80"><TableHead className="pl-5">Preventivo</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Importo</TableHead><TableHead className="text-right">Margine</TableHead><TableHead className="w-14" /></TableRow></TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const client = state.clients.find((item) => item.id === quote.clientId)
            const totals = calculateQuote(quote)
            const low = totals.marginPercent < state.settings.minimumMargin
            return (
              <TableRow key={quote.id} onClick={() => onOpen(quote)} className="cursor-pointer hover:bg-cyan-50/40">
                <TableCell className="min-w-56 pl-5"><p className="font-semibold text-slate-900">{quote.title}</p><p className="mt-0.5 text-xs text-slate-500">{quote.number}</p></TableCell>
                <TableCell className="min-w-48 text-slate-700">{client?.company}</TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">{formatDate(quote.date)}</TableCell>
                <TableCell><StatusBadge status={quote.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-right font-semibold text-slate-900">{money.format(totals.sale)}</TableCell>
                <TableCell className={`whitespace-nowrap text-right font-semibold ${low ? "text-amber-700" : "text-emerald-700"}`}>{number.format(totals.marginPercent)}%</TableCell>
                <TableCell><ChevronRight className="size-4 text-slate-400" /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function QuoteEditor({ quote, state, onChange, onCancel, onSave, onAi, onPreview, onAddClient }: { quote: Quote; state: QuoteFlowState; onChange: (quote: Quote) => void; onCancel: () => void; onSave: (quote: Quote) => void; onAi: () => void; onPreview: () => void; onAddClient: () => void }) {
  const totals = calculateQuote(quote)
  const lowMargin = totals.marginPercent < state.settings.minimumMargin
  const suggestedPrice = suggestedPriceForMargin(totals.cost, state.settings.minimumMargin)
  const valid = Boolean(quote.clientId && quote.title.trim() && quote.lines.some((line) => line.description.trim()) && totals.cost > 0)

  const patch = <K extends keyof Quote>(key: K, value: Quote[K]) => onChange({ ...quote, [key]: value })
  const patchLine = (id: string, next: Partial<QuoteLine>) => patch("lines", quote.lines.map((line) => line.id === id ? { ...line, ...next } : line))
  const addLine = () => patch("lines", [...quote.lines, newLine(state.settings)])
  const removeLine = (id: string) => quote.lines.length > 1 && patch("lines", quote.lines.filter((line) => line.id !== id))
  const setMaterial = (lineId: string, value: string) => {
    const selected = state.materials.find((material) => normalizeMatchText(material.name) === normalizeMatchText(value))
    patchLine(lineId, { material: value, ...(selected ? { materialCost: selected.price } : {}) })
  }
  const addOperation = (lineId: string) => patch("lines", quote.lines.map((line) => line.id === lineId ? { ...line, operations: [...line.operations, newOperation()] } : line))
  const patchOperation = (lineId: string, operationId: string, next: Partial<QuoteOperation>) => patch("lines", quote.lines.map((line) => line.id === lineId ? { ...line, operations: line.operations.map((operation) => operation.id === operationId ? { ...operation, ...next } : operation) } : line))
  const setOperation = (lineId: string, operation: QuoteOperation, value: string) => {
    const selected = state.processes.find((process) => normalizeMatchText(process.name) === normalizeMatchText(value))
    patchOperation(lineId, operation.id, selected
      ? { processId: selected.id, name: selected.name, category: selected.category, unit: selected.unit, rate: selected.price }
      : { processId: "", name: value })
  }
  const removeOperation = (lineId: string, operationId: string) => patch("lines", quote.lines.map((line) => line.id === lineId ? { ...line, operations: line.operations.filter((operation) => operation.id !== operationId) } : line))

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={onCancel} aria-label="Torna ai preventivi"><ArrowLeft /></Button>
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#14727d]">{quote.number}</p><h1 className="text-2xl font-bold tracking-tight text-slate-950">Componi il preventivo</h1><p className="text-sm text-slate-500">I totali vengono aggiornati in tempo reale.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onAi}><Sparkles className="text-amber-500" /> Importa richiesta</Button>
          <Button variant="outline" onClick={onPreview}><FileDown /> Anteprima PDF</Button>
          <Button disabled={!valid} onClick={() => onSave(quote)} className="bg-[#0b3d45] hover:bg-[#12525c]"><Check /> Salva preventivo</Button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Dati generali</CardTitle><CardDescription>Cliente, commessa e validità dell’offerta.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Cliente"><div className="flex gap-2"><Select value={quote.clientId} onValueChange={(value) => patch("clientId", value)}><SelectTrigger className="min-w-0 flex-1"><SelectValue /></SelectTrigger><SelectContent>{state.clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.company}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={onAddClient} aria-label="Aggiungi cliente"><UserPlus /></Button></div></Field>
              <Field label="Stato"><Select value={quote.status} onValueChange={(value) => patch("status", value as QuoteStatus)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["Bozza", "Inviato", "Accettato", "Rifiutato"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Data preventivo"><Input type="date" value={quote.date} onChange={(e) => patch("date", e.target.value)} /></Field>
              <Field label="Valido fino al"><Input type="date" value={quote.validUntil} onChange={(e) => patch("validUntil", e.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Commessa"><Input maxLength={90} value={quote.title} onChange={(e) => patch("title", e.target.value)} placeholder="Es. Carter inox linea confezionamento" /></Field></div>
              <div className="md:col-span-2"><Field label="Descrizione"><Input maxLength={180} value={quote.description} onChange={(e) => patch("description", e.target.value)} placeholder="Descrizione sintetica della fornitura" /></Field></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Voci del preventivo</CardTitle><CardDescription>Inserisci costi totali e ore previste per ogni voce.</CardDescription></div><Button variant="outline" onClick={addLine}><Plus /> Aggiungi voce</Button></CardHeader>
            <CardContent className="space-y-4">
              {quote.lines.map((line, index) => (
                <div key={line.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
                  <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">Voce {index + 1}</p><Button variant="ghost" size="icon" disabled={quote.lines.length === 1} onClick={() => removeLine(line.id)} className="text-slate-400 hover:text-rose-600" aria-label="Elimina voce"><Trash2 /></Button></div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="md:col-span-2 xl:col-span-3"><Field label="Descrizione"><Input value={line.description} onChange={(e) => patchLine(line.id, { description: e.target.value })} placeholder="Es. Carter inox piegato" /></Field></div>
                    <Field label="Quantità"><Input type="number" min="1" value={line.quantity} onChange={(e) => patchLine(line.id, { quantity: Number(e.target.value) })} /></Field>
                    <Field label="Unità"><Input value={line.unit} onChange={(e) => patchLine(line.id, { unit: e.target.value })} /></Field>
                    <div className="md:col-span-2 xl:col-span-4"><Field label="Materiale" hint="Cerca nel listino o inserisci un materiale personalizzato."><Input value={line.material} onChange={(e) => setMaterial(line.id, e.target.value)} list={`materials-${line.id}`} placeholder="Cerca materiale…" /><datalist id={`materials-${line.id}`}>{state.materials.map((material) => <option key={material.id} value={material.name}>{money.format(material.price)} · {material.unit}</option>)}</datalist></Field></div>
                    <div className="md:col-span-2 xl:col-span-2"><Field label="Costo materiale €" hint="Precompilato dal listino, sempre modificabile."><MoneyInput value={line.materialCost} onChange={(value) => patchLine(line.id, { materialCost: value })} /></Field></div>
                  </div>
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">Lavorazioni</p><p className="text-xs text-slate-500">Tariffe recuperate dal listino e modificabili.</p></div><Button type="button" size="sm" variant="outline" onClick={() => addOperation(line.id)}><Plus /> Aggiungi lavorazione</Button></div>
                    {line.operations.length ? <div className="space-y-2.5">{line.operations.map((operation) => (
                      <div key={operation.id} className="grid items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,2fr)_minmax(100px,0.8fr)_minmax(110px,0.9fr)_minmax(110px,0.9fr)_40px]">
                        <Field label="Lavorazione"><Input value={operation.name} onChange={(e) => setOperation(line.id, operation, e.target.value)} list={`processes-${line.id}-${operation.id}`} placeholder="Cerca nel listino…" /><datalist id={`processes-${line.id}-${operation.id}`}>{state.processes.map((process) => <option key={process.id} value={process.name}>{money.format(process.price)} · {process.unit}</option>)}</datalist></Field>
                        <Field label={operationQuantityLabel(operation.unit)}><NumberInput value={operation.quantity} onChange={(quantity) => patchOperation(line.id, operation.id, { quantity })} /></Field>
                        <Field label={`Tariffa ${operation.unit}`}><MoneyInput value={operation.rate} onChange={(rate) => patchOperation(line.id, operation.id, { rate })} /></Field>
                        <div><p className="mb-2 text-sm font-medium text-slate-700">Costo</p><div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-900">{money.format(operationCost(operation))}</div></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOperation(line.id, operation.id)} className="text-slate-400 hover:text-rose-600" aria-label={`Elimina ${operation.name || "lavorazione"}`}><Trash2 /></Button>
                      </div>
                    ))}</div> : <button type="button" onClick={() => addOperation(line.id)} className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 transition hover:border-[#14727d] hover:bg-white hover:text-[#0b3d45]">+ Aggiungi la prima lavorazione</button>}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Costi aggiuntivi €"><MoneyInput value={line.extraCost} onChange={(value) => patchLine(line.id, { extraCost: value })} /></Field></div>
                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 text-sm"><span className="text-slate-500">Costo voce</span><strong className="ml-3 text-slate-950">{money.format(calculateQuote({ lines: [line], markup: 0, vat: 0 }).cost)}</strong></div>
                </div>
              ))}
              <Button variant="outline" onClick={addLine} className="w-full border-dashed"><Plus /> Aggiungi un’altra voce</Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Note e condizioni specifiche</CardTitle></CardHeader>
            <CardContent><Textarea rows={4} value={quote.notes} onChange={(e) => patch("notes", e.target.value)} placeholder="Tempi di consegna, esclusioni, riferimenti tecnici…" /></CardContent>
          </Card>
        </div>

        <aside className="sticky top-20 space-y-4">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-base">Riepilogo economico</CardTitle><CardDescription>Prezzi IVA esclusa</CardDescription></CardHeader>
            <CardContent className="space-y-4 pt-5">
              <CostRow label="Materiali" value={totals.material} />
              <CostRow label="Macchine" value={totals.machine} />
              <CostRow label="Manodopera" value={totals.labor} />
              <CostRow label="Lavorazioni esterne" value={totals.external} />
              <CostRow label="Costi aggiuntivi" value={totals.extra} />
              <div className="border-t border-slate-200 pt-4"><CostRow label="Costo totale" value={totals.cost} strong /></div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ricarico %"><NumberInput value={quote.markup} onChange={(value) => patch("markup", value)} /></Field>
                <Field label="IVA %"><NumberInput value={quote.vat} onChange={(value) => patch("vat", value)} /></Field>
              </div>
              <div className="rounded-xl bg-[#0b3d45] p-4 text-white">
                <div className="flex items-end justify-between gap-3"><span className="text-sm text-cyan-100/80">Prezzo vendita</span><strong className="text-xl">{money.format(totals.sale)}</strong></div>
                <div className="mt-3 flex justify-between border-t border-white/15 pt-3 text-sm"><span className="text-cyan-100/80">Margine</span><strong>{money.format(totals.marginValue)} · {number.format(totals.marginPercent)}%</strong></div>
              </div>
              <CostRow label={`IVA ${quote.vat}%`} value={totals.vatValue} />
              <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-4"><span className="font-semibold text-slate-700">Totale cliente</span><strong className="text-2xl text-slate-950">{money.format(totals.customerTotal)}</strong></div>
            </CardContent>
          </Card>
          {lowMargin && totals.cost > 0 ? (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <AlertTriangle className="text-amber-600" />
              <AlertTitle>Margine insufficiente</AlertTitle>
              <AlertDescription className="leading-6">Il margine è {number.format(totals.marginPercent)}%, sotto la soglia del {state.settings.minimumMargin}%. Prezzo suggerito: <strong>{money.format(suggestedPrice)}</strong> + IVA.</AlertDescription>
            </Alert>
          ) : totals.cost > 0 ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950"><Check className="text-emerald-600" /><AlertTitle>Margine conforme</AlertTitle><AlertDescription>Supera la soglia minima aziendale.</AlertDescription></Alert>
          ) : null}
        </aside>
      </div>
    </>
  )
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <Input type="number" min="0" step="0.25" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <Input type="number" min="0" step="0.01" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
}

function CostRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 text-sm ${strong ? "font-semibold text-slate-950" : "text-slate-600"}`}><span>{label}</span><span className="font-mono font-semibold">{money.format(value)}</span></div>
}

function ClientsPage({ state, onOpenQuote, onAdd, onEdit }: { state: QuoteFlowState; onOpenQuote: (quote: Quote) => void; onAdd: () => void; onEdit: (client: Client) => void }) {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(state.clients[0]?.id ?? "")
  const clients = state.clients.filter((client) => `${client.company} ${client.contact} ${client.city}`.toLowerCase().includes(query.toLowerCase()))
  const selected = state.clients.find((client) => client.id === selectedId) ?? clients[0]
  const history = state.quotes.filter((quote) => quote.clientId === selected?.id)
  const historyValue = history.reduce((sum, quote) => sum + calculateQuote(quote).sale, 0)

  return (
    <>
      <PageHeading title="Clienti" description="Anagrafiche, contatti e storico commerciale in un unico posto." action={<Button onClick={onAdd} className="bg-[#0b3d45] hover:bg-[#12525c]"><UserPlus /> Nuovo cliente</Button>} />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca cliente…" className="pl-9" /></div></CardHeader>
          <CardContent className="max-h-[680px] space-y-1 overflow-auto p-2">
            {clients.map((client) => (
              <button key={client.id} onClick={() => setSelectedId(client.id)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${selected?.id === client.id ? "bg-[#e6f1f2]" : "hover:bg-slate-50"}`}>
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#0b3d45] text-xs font-bold text-white">{initials(client.company)}</div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{client.company}</p><p className="truncate text-xs text-slate-500">{client.contact} · {client.city}</p></div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-5">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div className="flex gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#0b3d45] text-base font-bold text-white">{initials(selected.company)}</div><div><h2 className="text-xl font-bold text-slate-950">{selected.company}</h2><p className="mt-1 text-sm text-slate-500">{selected.contact}</p></div></div>
                  <div className="flex items-center gap-2"><Badge variant="outline" className="w-fit border-cyan-200 bg-cyan-50 text-cyan-800">Cliente attivo</Badge><Button variant="outline" size="sm" onClick={() => onEdit(selected)}><PencilLine /> Modifica</Button></div>
                </div>
                <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Info label="Email" value={selected.email} /><Info label="Telefono" value={selected.phone} /><Info label="Sede" value={selected.city} /><Info label="Partita IVA" value={selected.vatNumber} /><Info label="Preventivi" value={String(history.length)} /><Info label="Valore storico" value={money.format(historyValue)} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Storico preventivi</CardTitle><CardDescription>{history.length} offerte collegate al cliente</CardDescription></CardHeader><CardContent className="px-0 pb-0">{history.length ? <QuotesTable quotes={history} state={state} onOpen={onOpenQuote} /> : <div className="p-6"><EmptyState title="Nessun preventivo" description="Non ci sono ancora offerte per questo cliente." /></div>}</CardContent></Card>
          </div>
        ) : <EmptyState title="Nessun cliente trovato" description="Prova una ricerca diversa." />}
      </div>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p></div>
}

function ClientFormDialog({ open, client, onClose, onSave }: { open: boolean; client: Client | null; onClose: () => void; onSave: (client: Client) => void }) {
  const [form, setForm] = useState<Client>(() => client ? { ...client } : emptyClient())
  const valid = Boolean(form.company.trim() && form.contact.trim() && form.email.trim())
  const patch = <K extends keyof Client>(key: K, value: Client[K]) => setForm((current) => ({ ...current, [key]: value }))
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{client && client.company ? "Modifica cliente" : "Nuovo cliente"}</DialogTitle><DialogDescription>I dati saranno disponibili subito nei preventivi e nello storico.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ragione sociale"><Input autoFocus value={form.company} onChange={(e) => patch("company", e.target.value)} placeholder="Es. Rossi Meccanica S.r.l." /></Field>
          <Field label="Referente"><Input value={form.contact} onChange={(e) => patch("contact", e.target.value)} placeholder="Nome e cognome" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => patch("email", e.target.value)} placeholder="acquisti@azienda.it" /></Field>
          <Field label="Telefono"><Input value={form.phone} onChange={(e) => patch("phone", e.target.value)} placeholder="+39 051…" /></Field>
          <Field label="Sede"><Input value={form.city} onChange={(e) => patch("city", e.target.value)} placeholder="Città (Provincia)" /></Field>
          <Field label="Partita IVA"><Input value={form.vatNumber} onChange={(e) => patch("vatNumber", e.target.value.toUpperCase())} placeholder="IT01234567890" /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><Button disabled={!valid} onClick={() => onSave({ ...form, company: form.company.trim(), contact: form.contact.trim(), email: form.email.trim() })} className="bg-[#0b3d45] hover:bg-[#12525c]"><Check /> Salva cliente</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CatalogsPage({ state, setState }: { state: QuoteFlowState; setState: React.Dispatch<React.SetStateAction<QuoteFlowState>> }) {
  const [deleteTarget, setDeleteTarget] = useState<{ type: "material" | "process"; id: string; name: string } | null>(null)
  const updateMaterial = (id: string, patch: Partial<MaterialRate>) => setState((current) => ({ ...current, materials: current.materials.map((item) => item.id === id ? { ...item, ...patch } : item) }))
  const updateProcess = (id: string, patch: Partial<ProcessRate>) => setState((current) => ({ ...current, processes: current.processes.map((item) => item.id === id ? { ...item, ...patch } : item) }))
  const addMaterial = () => setState((current) => ({ ...current, materials: [...current.materials, { id: uid(), name: "Nuovo materiale", category: "Altro", unit: "€/kg", price: 0 }] }))
  const addProcess = () => setState((current) => ({ ...current, processes: [...current.processes, { id: uid(), name: "Nuova lavorazione", category: "Macchina", unit: "€/h", price: 0 }] }))
  const confirmDelete = () => {
    if (!deleteTarget) return
    setState((current) => deleteTarget.type === "material"
      ? { ...current, materials: current.materials.filter((item) => item.id !== deleteTarget.id) }
      : { ...current, processes: current.processes.filter((item) => item.id !== deleteTarget.id) })
    toast.success(deleteTarget.type === "material" ? "Materiale eliminato" : "Lavorazione eliminata")
    setDeleteTarget(null)
  }

  return (
    <>
      <PageHeading title="Listini" description="Aggiorna materiali e lavorazioni ricorrenti. Le modifiche vengono salvate automaticamente nel browser." />
      <Tabs defaultValue="materials">
        <TabsList className="mb-4 bg-white shadow-sm"><TabsTrigger value="materials">Materiali</TabsTrigger><TabsTrigger value="processes">Lavorazioni</TabsTrigger></TabsList>
        <TabsContent value="materials">
          <Card className="border-slate-200 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Listino materiali</CardTitle><CardDescription>{state.materials.length} articoli disponibili</CardDescription></div><Button onClick={addMaterial} variant="outline"><Plus /> Aggiungi materiale</Button></CardHeader><CardContent className="px-0 pb-0"><CatalogTable header={["Materiale", "Categoria", "Unità", "Prezzo", ""]}>{state.materials.map((item) => <TableRow key={item.id}><TableCell className="pl-5"><Input value={item.name} onChange={(e) => updateMaterial(item.id, { name: e.target.value })} /></TableCell><TableCell><Input value={item.category} onChange={(e) => updateMaterial(item.id, { category: e.target.value })} /></TableCell><TableCell className="w-32"><Input value={item.unit} onChange={(e) => updateMaterial(item.id, { unit: e.target.value })} /></TableCell><TableCell className="w-40"><MoneyInput value={item.price} onChange={(price) => updateMaterial(item.id, { price })} /></TableCell><TableCell className="w-14 pr-5"><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "material", id: item.id, name: item.name })} className="text-slate-400 hover:text-rose-600" aria-label={`Elimina ${item.name}`}><Trash2 /></Button></TableCell></TableRow>)}</CatalogTable></CardContent></Card>
        </TabsContent>
        <TabsContent value="processes">
          <Card className="border-slate-200 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Listino lavorazioni</CardTitle><CardDescription>Tariffe interne ed esterne</CardDescription></div><Button onClick={addProcess} variant="outline"><Plus /> Aggiungi lavorazione</Button></CardHeader><CardContent className="px-0 pb-0"><CatalogTable header={["Lavorazione", "Categoria", "Unità", "Tariffa", ""]}>{state.processes.map((item) => <TableRow key={item.id}><TableCell className="pl-5"><Input value={item.name} onChange={(e) => updateProcess(item.id, { name: e.target.value })} /></TableCell><TableCell className="w-48"><Select value={item.category} onValueChange={(category) => updateProcess(item.id, { category: category as ProcessRate["category"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["Macchina", "Manodopera", "Esterna"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="w-32"><Input value={item.unit} onChange={(e) => updateProcess(item.id, { unit: e.target.value })} /></TableCell><TableCell className="w-40"><MoneyInput value={item.price} onChange={(price) => updateProcess(item.id, { price })} /></TableCell><TableCell className="w-14 pr-5"><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "process", id: item.id, name: item.name })} className="text-slate-400 hover:text-rose-600" aria-label={`Elimina ${item.name}`}><Trash2 /></Button></TableCell></TableRow>)}</CatalogTable></CardContent></Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminare “{deleteTarget?.name}”?</AlertDialogTitle><AlertDialogDescription>La voce verrà rimossa dal listino locale. I preventivi già creati non verranno modificati.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-rose-600 text-white hover:bg-rose-700">Elimina</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}

function CatalogTable({ header, children }: { header: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-slate-50">{header.map((item, index) => <TableHead key={item} className={index === 0 ? "pl-5" : ""}>{item}</TableHead>)}</TableRow></TableHeader><TableBody>{children}</TableBody></Table></div>
}

function SettingsPage({ state, setState, onReset }: { state: QuoteFlowState; setState: React.Dispatch<React.SetStateAction<QuoteFlowState>>; onReset: () => void }) {
  const settings = state.settings
  const patch = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => setState((current) => ({ ...current, settings: { ...current.settings, [key]: value } }))
  const handleLogoUpload = (file?: File) => {
    if (!file) return
    if (![/^image\/png$/, /^image\/jpeg$/].some((pattern) => pattern.test(file.type))) return toast.error("Usa un file PNG o JPG")
    if (file.size > 1_500_000) return toast.error("Il logo deve pesare meno di 1,5 MB")
    const reader = new FileReader()
    reader.onload = () => { patch("logoDataUrl", String(reader.result)); toast.success("Logo aziendale aggiornato") }
    reader.onerror = () => toast.error("Impossibile leggere il logo")
    reader.readAsDataURL(file)
  }
  return (
    <>
      <PageHeading title="Impostazioni" description="Dati aziendali e regole economiche applicate ai nuovi preventivi." action={<Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Salvataggio automatico</Badge>} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-[#14727d]" /> Dati aziendali</CardTitle><CardDescription>Informazioni riportate sui preventivi PDF.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Nome commerciale"><Input value={settings.companyName} onChange={(e) => patch("companyName", e.target.value)} /></Field><Field label="Ragione sociale"><Input value={settings.legalName} onChange={(e) => patch("legalName", e.target.value)} /></Field><Field label="Partita IVA"><Input value={settings.vatNumber} onChange={(e) => patch("vatNumber", e.target.value)} /></Field><Field label="Indirizzo"><Input value={settings.address} onChange={(e) => patch("address", e.target.value)} /></Field><Field label="Città"><Input value={settings.city} onChange={(e) => patch("city", e.target.value)} /></Field><Field label="Email"><Input type="email" value={settings.email} onChange={(e) => patch("email", e.target.value)} /></Field><Field label="Telefono"><Input value={settings.phone} onChange={(e) => patch("phone", e.target.value)} /></Field><div><Label className="text-sm font-medium text-slate-700">Logo azienda</Label><div className="mt-1.5 flex min-h-12 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">{settings.logoDataUrl ? <img src={settings.logoDataUrl} alt="Logo aziendale" className="size-9 rounded object-contain" /> : <div className="grid size-9 place-items-center rounded bg-[#0b3d45] text-xs font-black text-white">{initials(settings.companyName)}</div>}<div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-500">{settings.logoDataUrl ? "Logo caricato" : "PNG o JPG, massimo 1,5 MB"}</p></div><input id="company-logo" type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} /><label htmlFor="company-logo" className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"><Upload className="size-3.5" /> Carica</label></div></div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Factory className="size-4 text-[#14727d]" /> Regole economiche</CardTitle><CardDescription>Valori predefiniti per i nuovi preventivi.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Tariffa macchina €/h"><MoneyInput value={settings.defaultMachineRate} onChange={(value) => patch("defaultMachineRate", value)} /></Field><Field label="Manodopera €/h"><MoneyInput value={settings.defaultLaborRate} onChange={(value) => patch("defaultLaborRate", value)} /></Field><Field label="Ricarico predefinito %"><NumberInput value={settings.defaultMarkup} onChange={(value) => patch("defaultMarkup", value)} /></Field><Field label="Margine minimo %"><NumberInput value={settings.minimumMargin} onChange={(value) => patch("minimumMargin", value)} /></Field><Field label="IVA predefinita %"><NumberInput value={settings.defaultVat} onChange={(value) => patch("defaultVat", value)} /></Field><Field label="Validità preventivo (giorni)"><NumberInput value={settings.validityDays} onChange={(value) => patch("validityDays", value)} /></Field><div className="sm:col-span-2"><Field label="Condizioni di pagamento"><Input value={settings.paymentTerms} onChange={(e) => patch("paymentTerms", e.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Condizioni standard"><Textarea rows={4} value={settings.conditions} onChange={(e) => patch("conditions", e.target.value)} /></Field></div></CardContent></Card>
      </div>
      <Card className="mt-5 border-rose-200 bg-rose-50/40 shadow-sm"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900">Ripristina la demo</p><p className="mt-1 text-sm text-slate-500">Rimuove le modifiche locali e ricarica tutti i dati iniziali.</p></div><Button variant="outline" onClick={onReset} className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"><RefreshCcw /> Ripristina dati</Button></CardContent></Card>
    </>
  )
}

function QuoteDetailDialog({ quote, state, onClose, onEdit, onDuplicate, onDelete, onPdf }: { quote: Quote | null; state: QuoteFlowState; onClose: () => void; onEdit: (quote: Quote) => void; onDuplicate: (quote: Quote) => void; onDelete: (quote: Quote) => void; onPdf: (quote: Quote) => void }) {
  if (!quote) return null
  const client = state.clients.find((item) => item.id === quote.clientId)
  const totals = calculateQuote(quote)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-3xl">
        <DialogHeader><div className="flex flex-wrap items-center gap-2"><StatusBadge status={quote.status} /><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{quote.number}</span></div><DialogTitle className="pt-2 text-2xl">{quote.title}</DialogTitle><DialogDescription>{client?.company} · emesso il {formatDate(quote.date)}</DialogDescription></DialogHeader>
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"><Info label="Cliente" value={client?.company ?? "—"} /><Info label="Referente" value={client?.contact ?? "—"} /><Info label="Validità" value={formatDate(quote.validUntil)} /></div>
        <div className="overflow-x-auto rounded-xl border border-slate-200"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Voce</TableHead><TableHead>Q.tà</TableHead><TableHead>Materiale</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader><TableBody>{quote.lines.map((line) => <TableRow key={line.id}><TableCell><p className="font-semibold">{line.description}</p><p className="text-xs text-slate-500">{lineProcessSummary(line)}</p></TableCell><TableCell>{line.quantity} {line.unit}</TableCell><TableCell>{line.material}</TableCell><TableCell className="text-right font-semibold">{money.format(calculateQuote({ lines: [line], markup: 0, vat: 0 }).cost)}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="ml-auto w-full max-w-sm space-y-3 rounded-xl bg-[#0b3d45] p-5 text-white"><CostRowLight label="Costo totale" value={totals.cost} /><CostRowLight label="Prezzo vendita" value={totals.sale} /><CostRowLight label={`Margine ${number.format(totals.marginPercent)}%`} value={totals.marginValue} /><div className="border-t border-white/15 pt-3"><CostRowLight label="Totale cliente" value={totals.customerTotal} strong /></div></div>
        <DialogFooter className="sm:justify-between"><Button variant="ghost" onClick={() => onDelete(quote)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 /> Elimina</Button><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" onClick={onClose}>Chiudi</Button><Button variant="outline" onClick={() => onDuplicate(quote)}><Copy /> Duplica</Button><Button variant="outline" onClick={() => onEdit(quote)}><PencilLine /> Modifica</Button><Button onClick={() => onPdf(quote)} className="bg-[#0b3d45] hover:bg-[#12525c]"><FileDown /> PDF</Button></div></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CostRowLight({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 ${strong ? "text-base font-bold" : "text-sm"}`}><span className="text-cyan-50/80">{label}</span><span>{money.format(value)}</span></div>
}

function AiImportDialog({ open, state, onClose, onApply }: { open: boolean; state: QuoteFlowState; onClose: () => void; onApply: (quote: Quote) => void }) {
  const example = `Da: Referente Demo <referente2@example.com>\nOggetto: Richiesta offerta protezioni linea P8\n\nBuongiorno, avremmo bisogno di un'offerta per 16 pezzi di carter in acciaio inox AISI 304 spessore 2 mm. Sono richiesti taglio laser, piegatura e satinatura. La consegna ideale sarebbe entro fine ottobre. In allegato troverete il disegno aggiornato.\n\nGrazie,\nReferente Demo\nBeta Demo Packaging S.p.A.`
  const [email, setEmail] = useState(example)
  const [parsed, setParsed] = useState<{ clientId: string; description: string; quantity: number; material: string; materialCost: number; operations: QuoteOperation[]; notes: string } | null>(null)

  const analyze = () => {
    const lower = email.toLowerCase()
    const client = matchClientFromRequest(email, state.clients)
    const qty = email.match(/(\d+)\s*(?:pezzi|pz|unit[aà])/i)
    const materials = ["AISI 316L", "AISI 304", "S355J2", "S235JR", "Alluminio 6082"]
    const detectedMaterial = materials.find((item) => lower.includes(item.toLowerCase()))
    const catalogMaterial = detectedMaterial ? state.materials.find((item) => normalizeMatchText(item.name).includes(normalizeMatchText(detectedMaterial))) : undefined
    const material = catalogMaterial?.name ?? detectedMaterial ?? "Da verificare"
    const processOptions = ["taglio laser", "piegatura", "saldatura TIG", "saldatura MIG", "satinatura", "verniciatura", "fresatura"]
    const detectedProcesses = processOptions.filter((item) => lower.includes(item.toLowerCase()))
    const operations = detectedProcesses.map((detected) => {
      const normalizedDetected = normalizeMatchText(detected)
      const process = state.processes.find((item) => normalizeMatchText(item.name).includes(normalizedDetected) || normalizedDetected.includes(normalizeMatchText(item.name)))
      return process
        ? { id: uid(), processId: process.id, name: process.name, category: process.category, unit: process.unit, quantity: 1, rate: process.price }
        : { id: uid(), processId: "", name: detected[0].toUpperCase() + detected.slice(1), category: "Macchina" as ProcessCategory, unit: "€/h", quantity: 1, rate: 0 }
    })
    setParsed({
      clientId: client?.id ?? "",
      description: email.match(/(?:offerta per|preventivo per)\s+([^\.\n]+)/i)?.[1]?.trim() ?? "Fornitura da richiesta cliente",
      quantity: qty ? Number(qty[1]) : 1,
      material,
      materialCost: catalogMaterial?.price ?? 0,
      operations,
      notes: email.match(/(?:consegna|entro)\s+([^\.\n]+)/i)?.[0]?.trim() ?? "Verificare specifiche tecniche e tempi di consegna.",
    })
    toast.success("Richiesta analizzata", { description: "Controlla i campi evidenziati prima di procedere." })
  }

  const apply = () => {
    if (!parsed) return
    const quote = newQuote(state)
    quote.clientId = parsed.clientId
    quote.title = parsed.description.charAt(0).toUpperCase() + parsed.description.slice(1)
    quote.description = "Richiesta importata da email cliente; dati da verificare prima dell'invio."
    quote.notes = parsed.notes
    quote.lines = [{ ...quote.lines[0], description: parsed.description, quantity: parsed.quantity, material: parsed.material, materialCost: parsed.materialCost, processes: parsed.operations.map((operation) => operation.name).join(", "), operations: parsed.operations }]
    onApply(quote)
    setParsed(null)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-4xl">
        <DialogHeader><div className="mb-1 flex items-center gap-2 text-[#14727d]"><Sparkles className="size-4" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Estrazione assistita · Demo</span></div><DialogTitle className="text-2xl">Importa richiesta cliente</DialogTitle><DialogDescription>Incolla il testo ricevuto via email. I dati estratti non vengono salvati finché non li verifichi.</DialogDescription></DialogHeader>
        <div className={`grid gap-5 ${parsed ? "lg:grid-cols-2" : ""}`}>
          <div className="space-y-3"><Label>Email del cliente</Label><Textarea value={email} onChange={(e) => setEmail(e.target.value)} rows={15} className="font-mono text-sm leading-6" /><Button onClick={analyze} disabled={!email.trim()} className="w-full bg-[#0b3d45] hover:bg-[#12525c]"><Sparkles /> Analizza richiesta</Button></div>
          {parsed ? (
            <div className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
              <div className="flex items-center justify-between"><div><p className="font-semibold text-slate-900">Dati estratti</p><p className="text-xs text-slate-500">Modifica ciò che non è corretto.</p></div><Badge variant="outline" className={parsed.clientId ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{parsed.clientId ? "Cliente riconosciuto" : "Cliente da verificare"}</Badge></div>
              <Field label="Cliente"><Select value={parsed.clientId || "__verify__"} onValueChange={(clientId) => setParsed({ ...parsed, clientId: clientId === "__verify__" ? "" : clientId })}><SelectTrigger className={`w-full bg-white ${!parsed.clientId ? "border-amber-300 text-amber-800" : ""}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__verify__">Cliente da verificare</SelectItem>{state.clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.company}</SelectItem>)}</SelectContent></Select>{!parsed.clientId ? <p className="mt-1.5 text-xs font-medium text-amber-700">Seleziona il cliente corretto prima di continuare.</p> : null}</Field>
              <Field label="Descrizione"><Input value={parsed.description} onChange={(e) => setParsed({ ...parsed, description: e.target.value })} className="bg-white" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Quantità"><NumberInput value={parsed.quantity} onChange={(quantity) => setParsed({ ...parsed, quantity })} /></Field><Field label="Materiale"><Input value={parsed.material} onChange={(e) => { const value = e.target.value; const selected = state.materials.find((item) => normalizeMatchText(item.name) === normalizeMatchText(value)); setParsed({ ...parsed, material: value, ...(selected ? { materialCost: selected.price } : {}) }) }} list="import-materials" className="bg-white" /><datalist id="import-materials">{state.materials.map((material) => <option key={material.id} value={material.name} />)}</datalist></Field></div>
              <Field label="Lavorazioni"><div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-2">{parsed.operations.length ? parsed.operations.map((operation) => <Badge key={operation.id} variant="outline" className="bg-slate-50 text-slate-700">{operation.name}</Badge>) : <span className="text-sm text-slate-500">Nessuna lavorazione riconosciuta</span>}</div></Field>
              <Field label="Note"><Textarea rows={3} value={parsed.notes} onChange={(e) => setParsed({ ...parsed, notes: e.target.value })} className="bg-white" /></Field>
            </div>
          ) : null}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button>{parsed ? <Button disabled={!parsed.clientId} onClick={apply} className="bg-[#0b3d45] hover:bg-[#12525c]"><Check /> Usa nel preventivo</Button> : null}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PdfPreviewDialog({ quote, state, onClose }: { quote: Quote | null; state: QuoteFlowState; onClose: () => void }) {
  if (!quote) return null
  const client = state.clients.find((item) => item.id === quote.clientId)
  const totals = calculateQuote(quote)

  const download = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const teal = [11, 61, 69] as const
    doc.setFillColor(...teal); doc.rect(0, 0, 210, 34, "F")
    if (state.settings.logoDataUrl) {
      doc.setFillColor(255, 255, 255); doc.roundedRect(16, 9, 16, 16, 2, 2, "F")
      try { doc.addImage(state.settings.logoDataUrl, state.settings.logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", 17, 10, 14, 14) } catch { /* fallback text below */ }
    } else {
      doc.setFillColor(255, 180, 84); doc.roundedRect(16, 9, 16, 16, 2, 2, "F")
      doc.setTextColor(...teal); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(initials(state.settings.companyName), 24, 19.5, { align: "center" })
    }
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text(state.settings.legalName, 38, 15)
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`${state.settings.address}, ${state.settings.city}  |  P.IVA ${state.settings.vatNumber}`, 38, 21)
    doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.text("PREVENTIVO", 16, 50)
    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text(`${quote.number}  |  ${formatDate(quote.date)}`, 16, 56)
    doc.setFillColor(244, 247, 248); doc.roundedRect(16, 65, 178, 34, 2, 2, "F")
    doc.setTextColor(15, 23, 42); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("CLIENTE", 22, 73)
    doc.setFontSize(11); doc.text(client?.company ?? "Cliente", 22, 81)
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`${client?.contact ?? ""}  |  ${client?.email ?? ""}`, 22, 87)
    doc.text(`${client?.city ?? ""}  |  P.IVA ${client?.vatNumber ?? ""}`, 22, 92)
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(quote.title, 16, 111)
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(doc.splitTextToSize(quote.description || "Fornitura come da specifiche concordate.", 178), 16, 117)
    let y = 132
    doc.setFillColor(...teal); doc.rect(16, y, 178, 9, "F")
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8)
    doc.text("DESCRIZIONE", 19, y + 6); doc.text("Q.TA", 126, y + 6); doc.text("PREZZO", 190, y + 6, { align: "right" })
    y += 9
    quote.lines.forEach((line) => {
      const rowCost = calculateQuote({ lines: [line], markup: 0, vat: 0 }).cost
      const rowSale = rowCost * (1 + quote.markup / 100)
      doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text(line.description || "Voce preventivo", 19, y + 7)
      doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.text(`${line.material} | ${lineProcessSummary(line)}`, 19, y + 13)
      doc.setTextColor(15, 23, 42); doc.text(`${line.quantity} ${line.unit}`, 126, y + 7); doc.text(money.format(rowSale), 190, y + 7, { align: "right" })
      doc.setDrawColor(226, 232, 240); doc.line(16, y + 17, 194, y + 17); y += 18
    })
    y = Math.max(y + 7, 178)
    const summaryX = 126
    doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.text("Imponibile", summaryX, y); doc.text(money.format(totals.sale), 190, y, { align: "right" })
    doc.text(`IVA ${quote.vat}%`, summaryX, y + 8); doc.text(money.format(totals.vatValue), 190, y + 8, { align: "right" })
    doc.setDrawColor(11, 61, 69); doc.line(summaryX, y + 13, 194, y + 13)
    doc.setTextColor(...teal); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("TOTALE", summaryX, y + 23); doc.text(money.format(totals.customerTotal), 190, y + 23, { align: "right" })
    const conditionsY = Math.max(y + 42, 230)
    doc.setTextColor(15, 23, 42); doc.setFontSize(8); doc.text("CONDIZIONI", 16, conditionsY)
    doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105)
    doc.text(doc.splitTextToSize(`Validita: ${formatDate(quote.validUntil)}. Pagamento: ${state.settings.paymentTerms}. ${state.settings.conditions} ${quote.notes}`, 178), 16, conditionsY + 6)
    doc.setFillColor(...teal); doc.rect(0, 286, 210, 11, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.text(`${state.settings.email}  |  ${state.settings.phone}`, 105, 292.5, { align: "center" })
    doc.save(`${quote.number}-${client?.company ?? "cliente"}.pdf`)
    toast.success("PDF generato")
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] overflow-auto bg-slate-100 sm:max-w-5xl">
        <DialogHeader><DialogTitle>Anteprima preventivo</DialogTitle><DialogDescription>Documento pronto per il cliente.</DialogDescription></DialogHeader>
        <div className="mx-auto w-full max-w-[760px] bg-white p-6 shadow-xl sm:p-10">
          <div className="-mx-6 -mt-6 flex items-center justify-between bg-[#0b3d45] px-6 py-5 text-white sm:-mx-10 sm:-mt-10 sm:px-10"><div className="flex items-center gap-3">{state.settings.logoDataUrl ? <img src={state.settings.logoDataUrl} alt="Logo aziendale" className="size-10 rounded-lg bg-white object-contain p-1" /> : <div className="grid size-10 place-items-center rounded-lg bg-[#ffb454] font-black text-[#0b3d45]">{initials(state.settings.companyName)}</div>}<div><p className="font-bold">{state.settings.legalName}</p><p className="text-xs text-cyan-50/70">{state.settings.city} · {state.settings.vatNumber}</p></div></div><FileText className="hidden size-7 text-white/50 sm:block" /></div>
          <div className="mt-9 flex flex-col justify-between gap-5 sm:flex-row"><div><p className="text-2xl font-black tracking-tight text-slate-950">PREVENTIVO</p><p className="mt-1 text-xs text-slate-500">{quote.number} · {formatDate(quote.date)}</p></div><div className="rounded-lg bg-slate-50 p-4 text-sm sm:min-w-72"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</p><p className="mt-1 font-bold text-slate-900">{client?.company}</p><p className="mt-1 text-xs leading-5 text-slate-500">{client?.contact}<br />{client?.email}<br />{client?.city}</p></div></div>
          <div className="mt-8"><h2 className="text-lg font-bold text-slate-950">{quote.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{quote.description}</p></div>
          <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="bg-[#0b3d45] text-left text-xs uppercase tracking-wide text-white"><th className="p-3">Descrizione</th><th className="p-3">Quantità</th><th className="p-3 text-right">Prezzo</th></tr></thead><tbody>{quote.lines.map((line) => { const sale = calculateQuote({ lines: [line], markup: 0, vat: 0 }).cost * (1 + quote.markup / 100); return <tr key={line.id} className="border-b border-slate-200"><td className="p-3"><p className="font-semibold text-slate-900">{line.description}</p><p className="mt-1 text-xs text-slate-500">{line.material} · {lineProcessSummary(line)}</p></td><td className="p-3 text-slate-600">{line.quantity} {line.unit}</td><td className="p-3 text-right font-semibold">{money.format(sale)}</td></tr> })}</tbody></table></div>
          <div className="mt-7 ml-auto max-w-xs space-y-2 text-sm"><CostRow label="Imponibile" value={totals.sale} /><CostRow label={`IVA ${quote.vat}%`} value={totals.vatValue} /><div className="border-t border-[#0b3d45] pt-3"><div className="flex items-end justify-between"><span className="font-bold text-[#0b3d45]">Totale</span><span className="text-xl font-black text-[#0b3d45]">{money.format(totals.customerTotal)}</span></div></div></div>
          <div className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500"><p className="font-bold uppercase tracking-wide text-slate-700">Condizioni</p><p className="mt-1">Validità: {formatDate(quote.validUntil)}. Pagamento: {state.settings.paymentTerms}.</p><p>{state.settings.conditions} {quote.notes}</p></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Chiudi</Button><Button onClick={download} className="bg-[#0b3d45] hover:bg-[#12525c]"><Download /> Scarica PDF</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const formatDate = (value: string) => value ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—"
const initials = (value: string) => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
