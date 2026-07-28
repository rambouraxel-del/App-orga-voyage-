import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Button, StateBlock } from '@/components/ui'
import { useDatabaseBootstrap } from '@/hooks/useDatabaseBootstrap'
import { AppLayout } from '@/navigation/AppLayout'
import { ROUTES } from '@/navigation/routes'
import { AgendaPage } from '@/pages/AgendaPage'
import { BackupPage } from '@/pages/BackupPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventsPage } from '@/pages/EventsPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { TripsPage } from '@/pages/TripsPage'

export default function App() {
  const bootstrap = useDatabaseBootstrap()

  if (bootstrap.status === 'loading') {
    return (
      <div className="boot-screen">
        <div className="boot-screen__dot" />
        <span className="visually-hidden">Chargement de tes aventures…</span>
      </div>
    )
  }

  if (bootstrap.status === 'error') {
    return (
      <div className="app-main">
        <StateBlock
          error
          title="Base de donnees inaccessible"
          text={bootstrap.error ?? undefined}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reessayer
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {/*
        HashRouter plutot que BrowserRouter : GitHub Pages ne peut pas reecrire
        les URLs profondes vers index.html. Le hash garantit qu'un rechargement
        ou un lien partage fonctionne, y compris depuis un sous-chemin.
      */}
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.agenda} element={<AgendaPage />} />
            <Route path={ROUTES.events} element={<EventsPage />} />
            <Route path={ROUTES.eventDetail} element={<EventDetailPage />} />
            <Route path={ROUTES.trips} element={<TripsPage />} />
            <Route path={ROUTES.backup} element={<BackupPage />} />
            <Route path="/index.html" element={<Navigate to={ROUTES.home} replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
