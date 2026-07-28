import { useNavigate } from 'react-router-dom'
import { Button, StateBlock } from '@/components/ui'
import { ROUTES } from '@/navigation/routes'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <StateBlock
      icon="boussole"
      title="Page introuvable"
      text="Cette page n’existe pas (ou pas encore). Reviens a l’accueil pour continuer."
      action={
        <Button variant="secondary" onClick={() => navigate(ROUTES.home)}>
          Retour a l’accueil
        </Button>
      }
    />
  )
}
