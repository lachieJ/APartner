import { createContext, useContext } from 'react'
import type { ConceptCompactBranchContract } from '../components/ConceptCompactBranch'

export const ConceptCompactBranchContext = createContext<ConceptCompactBranchContract | null>(null)

export function useConceptCompactBranchContract() {
  const contract = useContext(ConceptCompactBranchContext)
  if (!contract) {
    throw new Error('ConceptCompactBranch must be used within ConceptCompactBranchProvider')
  }

  return contract
}
