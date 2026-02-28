export function confirmSingleLinkClear(linkTypeLabel: 'PartOf' | 'ReferenceTo') {
  return window.confirm(`Clear ${linkTypeLabel} link for this concept?`)
}

export function confirmBulkLinkClear(linkTypeLabel: 'PartOf' | 'ReferenceTo', count: number) {
  return window.confirm(`Clear ${linkTypeLabel} links for ${count} concept(s)?`)
}

export function confirmSafeAutoFix(partOfCount: number, referenceToCount: number) {
  return window.confirm(
    [
      'Apply safe auto-fix?',
      `- PartOf links to clear: ${partOfCount}`,
      `- ReferenceTo links to clear: ${referenceToCount}`,
    ].join('\n'),
  )
}

export function promptRemediationReason(defaultReason = 'Safe auto-fix from diagnostics') {
  const reasonInput = window.prompt('Optional remediation reason for audit log:', defaultReason)
  if (reasonInput === null) {
    return undefined
  }

  return reasonInput
}