type SiblingOrderable = {
  id: string
  name: string
  part_order: number | null
}

export const orderSiblings = <T extends SiblingOrderable>(siblings: T[]): T[] => {
  return [...siblings].sort((left, right) => {
    const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.name.localeCompare(right.name)
  })
}

export const groupSiblingsByParent = <T extends SiblingOrderable>(
  items: T[],
  getParentId: (item: T) => string | null,
): Map<string, T[]> => {
  const siblingsByParentId = new Map<string, T[]>()

  for (const item of items) {
    const parentId = getParentId(item)
    if (!parentId) {
      continue
    }

    const siblings = siblingsByParentId.get(parentId) ?? []
    siblings.push(item)
    siblingsByParentId.set(parentId, siblings)
  }

  for (const [parentId, siblings] of siblingsByParentId) {
    siblingsByParentId.set(parentId, orderSiblings(siblings))
  }

  return siblingsByParentId
}

export const reorderSiblingList = <T extends SiblingOrderable>(
  siblings: T[],
  itemId: string,
  direction: 'up' | 'down',
): T[] | null => {
  const ordered = orderSiblings(siblings)
  const currentIndex = ordered.findIndex((item) => item.id === itemId)
  if (currentIndex < 0) {
    return null
  }

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (swapIndex < 0 || swapIndex >= ordered.length) {
    return null
  }

  const reordered = [...ordered]
  const [moved] = reordered.splice(currentIndex, 1)
  reordered.splice(swapIndex, 0, moved)

  return reordered
}