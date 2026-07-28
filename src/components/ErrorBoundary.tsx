import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'
import { StateBlock } from './ui/StateBlock'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Filet de securite : une erreur de rendu ne doit jamais laisser un ecran
 * blanc. Le detail technique part en console, l'utilisateur voit un message
 * comprehensible et peut relancer l'application.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Mes Aventures] Erreur de rendu', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="app-main">
        <StateBlock
          error
          title="Une erreur est survenue"
          text="L’application a rencontre un probleme inattendu. Tes donnees locales sont intactes."
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Relancer l’application
            </Button>
          }
        />
      </div>
    )
  }
}
