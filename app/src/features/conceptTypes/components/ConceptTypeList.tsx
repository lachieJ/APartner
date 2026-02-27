import { useEffect, useState } from 'react'
import type { ConceptTypeRecord } from '../csv/types'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { useConceptTypeGraphState } from '../hooks/useConceptTypeGraphState'
import type { ConceptTypeFlatRowActions, ConceptTypeTreeRowActions } from '../types/listActions'
import type { RootFilterMode } from '../utils/conceptTypeGraphDerivations'
import { getConceptTypeUsage } from '../utils/conceptTypeRowHelpers'
import { ConceptTypeIssuesPanel } from './ConceptTypeIssuesPanel'
import { ConceptTypeFlatRow } from './ConceptTypeFlatRow'
import { ConceptTypeTreeNode } from './ConceptTypeTreeNode'

type ConceptTypeListProps = {
  conceptTypes: ConceptTypeRecord[]
  loading: boolean
  onEdit: (conceptType: ConceptTypeRecord) => void
  onDelete: (id: string) => void
  movingConceptTypeId: string | null
  onMoveConceptType: (id: string, direction: 'up' | 'down') => void
  normalizingSiblingOrders: boolean
  onNormalizeSiblingOrders: () => void
}

export function ConceptTypeList({
  conceptTypes,
  loading,
  onEdit,
  onDelete,
  movingConceptTypeId,
  onMoveConceptType,
  normalizingSiblingOrders,
  onNormalizeSiblingOrders,
}: ConceptTypeListProps) {
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat')
  const [selectedRootId, setSelectedRootId] = useState('')
  const [rootFilterMode, setRootFilterMode] = useState<RootFilterMode>('partof-empty-or-self')
  const [showIssuesOnly, setShowIssuesOnly] = useState(false)
  const [expandedUsageIds, setExpandedUsageIds] = useState<Record<string, boolean>>({})
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Record<string, boolean>>({})
  const { copiedKey, copyValue } = useCopyFeedback()

  const {
    rootOptions,
    conceptById,
    inboundUsageByConceptId,
    childrenByParentId,
    issueSummary,
    displayedConceptTypes,
  } = useConceptTypeGraphState({
    conceptTypes,
    rootFilterMode,
    showIssuesOnly,
  })

  useEffect(() => {
    if (rootOptions.length === 0) {
      setSelectedRootId('')
      return
    }

    const exists = rootOptions.some((conceptType) => conceptType.id === selectedRootId)
    if (!exists) {
      setSelectedRootId(rootOptions[0].id)
    }
  }, [rootOptions, selectedRootId])

  const selectedRoot = selectedRootId ? conceptById.get(selectedRootId) ?? null : null

  const toggleUsage = (conceptTypeId: string) => {
    setExpandedUsageIds((previous) => ({
      ...previous,
      [conceptTypeId]: !previous[conceptTypeId],
    }))
  }

  const toggleDescription = (conceptTypeId: string) => {
    setExpandedDescriptionIds((previous) => ({
      ...previous,
      [conceptTypeId]: !previous[conceptTypeId],
    }))
  }

  const jumpToWhereUsed = (conceptTypeId: string) => {
    setViewMode('flat')
    setExpandedUsageIds((previous) => ({
      ...previous,
      [conceptTypeId]: true,
    }))
  }

  const flatRowActions: ConceptTypeFlatRowActions = {
    onToggleDescription: toggleDescription,
    onToggleUsage: toggleUsage,
    onCopyValue: copyValue,
    onEdit,
    onDelete,
  }

  const treeRowActions: ConceptTypeTreeRowActions = {
    onToggleDescription: toggleDescription,
    onMoveConceptType,
    onCopyValue: copyValue,
    onEdit,
    onDelete,
  }

  return (
    <>
      {loading ? <p>Loading...</p> : null}
      {!loading && conceptTypes.length === 0 ? <p>No concept types yet.</p> : null}

      {!loading && conceptTypes.length > 0 ? (
        <div className="viewControls">
          <label>
            View
            <select value={viewMode} onChange={(event) => setViewMode(event.target.value as 'flat' | 'tree')}>
              <option value="flat">Flat list</option>
              <option value="tree">Tree from selected root</option>
            </select>
          </label>

          {viewMode === 'tree' ? (
            <>
              <label>
                Root filter
                <select
                  value={rootFilterMode}
                  onChange={(event) => setRootFilterMode(event.target.value as RootFilterMode)}
                >
                  <option value="partof-empty">PartOf is empty</option>
                  <option value="partof-self">PartOf is self</option>
                  <option value="partof-empty-or-self">PartOf is empty or self</option>
                  <option value="all">All concept types</option>
                </select>
              </label>

              <label>
                Root ConceptType
                <select value={selectedRootId} onChange={(event) => setSelectedRootId(event.target.value)}>
                  {rootOptions.map((conceptType) => (
                    <option key={conceptType.id} value={conceptType.id}>
                      {conceptType.name} ({conceptType.id})
                    </option>
                  ))}
                </select>
              </label>

              <div className="actions">
                <button type="button" onClick={onNormalizeSiblingOrders} disabled={normalizingSiblingOrders}>
                  {normalizingSiblingOrders ? 'Normalizing...' : 'Normalize sibling orders'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!loading && conceptTypes.length > 0 ? (
        <ConceptTypeIssuesPanel
          issueSummary={issueSummary}
          conceptById={conceptById}
          showIssuesOnly={showIssuesOnly}
          onToggleShowIssuesOnly={setShowIssuesOnly}
          onJumpToWhereUsed={jumpToWhereUsed}
          onEdit={onEdit}
          normalizingSiblingOrders={normalizingSiblingOrders}
          onNormalizeSiblingOrders={onNormalizeSiblingOrders}
        />
      ) : null}

      {!loading && viewMode === 'flat'
        ? displayedConceptTypes.map((conceptType) => (
            <ConceptTypeFlatRow
              key={conceptType.id}
              conceptType={conceptType}
              usage={getConceptTypeUsage(inboundUsageByConceptId, conceptType.id)}
              isDescriptionExpanded={Boolean(expandedDescriptionIds[conceptType.id])}
              isUsageExpanded={Boolean(expandedUsageIds[conceptType.id])}
              copiedKey={copiedKey}
              actions={flatRowActions}
            />
          ))
        : null}

      {!loading && viewMode === 'flat' && showIssuesOnly && displayedConceptTypes.length === 0 ? (
        <p className="hint">No affected items match the current issue set.</p>
      ) : null}

      {!loading && viewMode === 'tree' && selectedRoot ? (
        <ul className="treeList">
          <ConceptTypeTreeNode
            conceptType={selectedRoot}
            parentId={null}
            visited={new Set()}
            childrenByParentId={childrenByParentId}
            expandedDescriptionIds={expandedDescriptionIds}
            copiedKey={copiedKey}
            movingConceptTypeId={movingConceptTypeId}
            actions={treeRowActions}
          />
        </ul>
      ) : null}

      {!loading && viewMode === 'tree' && !selectedRoot && rootOptions.length === 0 ? (
        <p className="hint">No root options match the current filter.</p>
      ) : null}
    </>
  )
}
