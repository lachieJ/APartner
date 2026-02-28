import {
  confirmBulkLinkClear,
  confirmSafeAutoFix,
  confirmSingleLinkClear,
  promptRemediationReason,
} from '../utils/remediationPrompts'

type UseConceptRemediationActionsParams = {
  onClearPartOfForConcept: (id: string) => Promise<void>
  onClearReferenceToForConcept: (id: string) => Promise<void>
  onClearPartOfForConceptsBulk: (ids: string[]) => Promise<void>
  onClearReferenceToForConceptsBulk: (ids: string[]) => Promise<void>
  onRunSafeAutoFix: (partOfIds: string[], referenceToIds: string[], reason?: string) => Promise<void>
  onRefreshAudits: () => Promise<void>
}

export function useConceptRemediationActions({
  onClearPartOfForConcept,
  onClearReferenceToForConcept,
  onClearPartOfForConceptsBulk,
  onClearReferenceToForConceptsBulk,
  onRunSafeAutoFix,
  onRefreshAudits,
}: UseConceptRemediationActionsParams) {
  const executeAndRefresh = async (action: () => Promise<void>) => {
    await action()
    await onRefreshAudits()
  }

  const handleClearPartOfLink = async (id: string) => {
    if (confirmSingleLinkClear('PartOf')) {
      await executeAndRefresh(() => onClearPartOfForConcept(id))
    }
  }

  const handleClearReferenceToLink = async (id: string) => {
    if (confirmSingleLinkClear('ReferenceTo')) {
      await executeAndRefresh(() => onClearReferenceToForConcept(id))
    }
  }

  const handleClearPartOfLinksBulk = async (ids: string[]) => {
    if (ids.length === 0) {
      return
    }

    if (confirmBulkLinkClear('PartOf', ids.length)) {
      await executeAndRefresh(() => onClearPartOfForConceptsBulk(ids))
    }
  }

  const handleClearReferenceToLinksBulk = async (ids: string[]) => {
    if (ids.length === 0) {
      return
    }

    if (confirmBulkLinkClear('ReferenceTo', ids.length)) {
      await executeAndRefresh(() => onClearReferenceToForConceptsBulk(ids))
    }
  }

  const handleApplySafeAutoFix = async (partOfIds: string[], referenceToIds: string[]) => {
    const uniquePartOfIds = Array.from(new Set(partOfIds))
    const uniqueReferenceToIds = Array.from(new Set(referenceToIds))

    if (uniquePartOfIds.length === 0 && uniqueReferenceToIds.length === 0) {
      return
    }

    const confirmed = confirmSafeAutoFix(uniquePartOfIds.length, uniqueReferenceToIds.length)

    if (!confirmed) {
      return
    }

    const reason = promptRemediationReason('Safe auto-fix from diagnostics')

    await executeAndRefresh(() => onRunSafeAutoFix(uniquePartOfIds, uniqueReferenceToIds, reason))
  }

  return {
    handleClearPartOfLink,
    handleClearReferenceToLink,
    handleClearPartOfLinksBulk,
    handleClearReferenceToLinksBulk,
    handleApplySafeAutoFix,
  }
}