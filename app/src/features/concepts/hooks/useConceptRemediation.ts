import { Dispatch, SetStateAction } from 'react'
import {
  clearConceptLinksBulk,
  clearConceptPartOfLink,
  clearConceptPartOfLinksBulk,
  clearConceptReferenceToLink,
  clearConceptReferenceToLinksBulk,
  insertConceptRemediationAudit,
} from '../data/conceptService'

type UseConceptRemediationParams = {
  reloadConcepts: () => Promise<void>
  setMessage: Dispatch<SetStateAction<string | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useConceptRemediation({
  reloadConcepts,
  setMessage,
  setError,
}: UseConceptRemediationParams) {
  const recordRemediationAudit = async (
    actionKind: string,
    partOfIds: string[],
    referenceToIds: string[],
    reason: string | null,
  ) => {
    const affectedConceptIds = Array.from(new Set([...partOfIds, ...referenceToIds]))
    const auditError = await insertConceptRemediationAudit({
      actionKind,
      reason,
      partOfClearedCount: partOfIds.length,
      referenceToClearedCount: referenceToIds.length,
      affectedConceptIds,
    })

    if (auditError) {
      setError(`Remediation applied, but audit logging failed: ${auditError}`)
    }
  }

  const clearPartOfForConcept = async (id: string) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptPartOfLink(id)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage('Cleared PartOf link.')
    await recordRemediationAudit('clear-partof-single', [id], [], 'Single PartOf link cleared from diagnostics.')
    await reloadConcepts()
  }

  const clearReferenceToForConcept = async (id: string) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptReferenceToLink(id)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage('Cleared ReferenceTo link.')
    await recordRemediationAudit(
      'clear-referenceto-single',
      [],
      [id],
      'Single ReferenceTo link cleared from diagnostics.',
    )
    await reloadConcepts()
  }

  const clearPartOfForConceptsBulk = async (ids: string[]) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptPartOfLinksBulk(ids)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage(`Cleared PartOf links for ${ids.length} concept(s).`)
    await recordRemediationAudit('clear-partof-bulk', ids, [], 'Bulk PartOf link clear from diagnostics.')
    await reloadConcepts()
  }

  const clearReferenceToForConceptsBulk = async (ids: string[]) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptReferenceToLinksBulk(ids)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage(`Cleared ReferenceTo links for ${ids.length} concept(s).`)
    await recordRemediationAudit('clear-referenceto-bulk', [], ids, 'Bulk ReferenceTo link clear from diagnostics.')
    await reloadConcepts()
  }

  const runSafeAutoFix = async (partOfIds: string[], referenceToIds: string[], reason?: string) => {
    setMessage(null)
    setError(null)

    const uniquePartOfIds = Array.from(new Set(partOfIds))
    const uniqueReferenceToIds = Array.from(new Set(referenceToIds))

    if (uniquePartOfIds.length === 0 && uniqueReferenceToIds.length === 0) {
      setMessage('No safe auto-fix actions were required.')
      return
    }

    const updateError = await clearConceptLinksBulk(uniquePartOfIds, uniqueReferenceToIds)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage(
      `Safe auto-fix applied. Cleared PartOf: ${uniquePartOfIds.length}, Cleared ReferenceTo: ${uniqueReferenceToIds.length}.`,
    )
    await recordRemediationAudit(
      'safe-auto-fix',
      uniquePartOfIds,
      uniqueReferenceToIds,
      reason?.trim() ? reason.trim() : 'Safe auto-fix from diagnostics.',
    )
    await reloadConcepts()
  }

  return {
    clearPartOfForConcept,
    clearReferenceToForConcept,
    clearPartOfForConceptsBulk,
    clearReferenceToForConceptsBulk,
    runSafeAutoFix,
  }
}