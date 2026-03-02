import { type ReactNode } from 'react'
import type { ConceptCompactBranchContract } from './ConceptCompactBranch'
import { ConceptCompactBranchContext } from '../hooks/useConceptCompactBranchContext'

export function ConceptCompactBranchProvider({
  value,
  children,
}: {
  value: ConceptCompactBranchContract
  children: ReactNode
}) {
  return <ConceptCompactBranchContext.Provider value={value}>{children}</ConceptCompactBranchContext.Provider>
}
