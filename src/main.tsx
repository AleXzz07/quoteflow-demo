import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import QuoteFlowApp from "@/components/quote-flow-app"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QuoteFlowApp />
  </StrictMode>,
)
