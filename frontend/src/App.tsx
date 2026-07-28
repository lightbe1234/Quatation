import { useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { OneDrivePage } from './pages/OneDrivePage'
import {
  createEmptyQuotationDraft,
  QuotationEntryPage,
} from './pages/QuotationEntryPage'
import { RecordsPage } from './pages/RecordsPage'
import { StoresPage } from './pages/StoresPage'
import type { QuotationDraft } from './types/quotation'

function AuthenticatedLayout() {
  const location = useLocation()
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
          Loading secure workspace...
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <AppLayout />
}

function App() {
  const [quotationDraft, setQuotationDraft] = useState<QuotationDraft>(
    createEmptyQuotationDraft,
  )

  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route
            path="quotations/new"
            element={
              <QuotationEntryPage
                persistedDraft={quotationDraft}
                setPersistedDraft={setQuotationDraft}
              />
            }
          />
          <Route path="records" element={<RecordsPage />} />
          <Route path="onedrive" element={<OneDrivePage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
