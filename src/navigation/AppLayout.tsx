import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/** Coquille commune : zone de contenu defilante + barre de navigation fixe. */
export function AppLayout() {
  const { pathname } = useLocation()

  // Chaque changement d'onglet repart en haut de page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="app-shell">
      <main className="app-main" id="contenu">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
