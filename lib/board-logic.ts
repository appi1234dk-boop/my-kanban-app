import { arrayMove } from '@dnd-kit/sortable'
import type { Card, Column } from '@/lib/types'

/**
 * 컬럼 재정렬: sortedColumns 기준으로 두 컬럼 ID를 교환하고
 * position을 1000 단위로 재할당합니다.
 */
export function reorderColumns(
  sortedColumns: Column[],
  activeColId: string,
  overColId: string
): Column[] {
  const oldIdx = sortedColumns.findIndex((c) => c.id === activeColId)
  const newIdx = sortedColumns.findIndex((c) => c.id === overColId)
  if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return sortedColumns
  const reordered = arrayMove(sortedColumns, oldIdx, newIdx)
  return reordered.map((col, i) => ({ ...col, position: (i + 1) * 1000 }))
}

/**
 * 같은 컬럼 내 카드 재정렬: activeId → overId 위치로 이동하고
 * position을 재할당합니다.
 */
export function reorderCardsInColumn(
  allCards: Card[],
  activeId: string,
  overId: string
): Card[] {
  const activeCard = allCards.find((c) => c.id === activeId)
  const overCard = allCards.find((c) => c.id === overId)
  if (!activeCard || !overCard) return allCards
  if (activeCard.column_id !== overCard.column_id) return allCards

  const colCards = allCards
    .filter((c) => c.column_id === activeCard.column_id)
    .sort((a, b) => b.position - a.position)
  const oldIdx = colCards.findIndex((c) => c.id === activeId)
  const newIdx = colCards.findIndex((c) => c.id === overId)
  if (oldIdx === -1 || newIdx === -1) return allCards

  const reordered = arrayMove(colCards, oldIdx, newIdx)
  const updatedMap = new Map(
    reordered.map((c, i) => [c.id, { ...c, position: (reordered.length - i) * 1000 }])
  )
  return allCards.map((c) => updatedMap.get(c.id) ?? c)
}

/**
 * 카드를 다른 컬럼으로 이동: column_id를 업데이트합니다.
 */
export function moveCardToColumn(
  allCards: Card[],
  cardId: string,
  targetColumnId: string
): Card[] {
  return allCards.map((c) => (c.id === cardId ? { ...c, column_id: targetColumnId } : c))
}

/**
 * 진행률 계산
 */
export function calcProgress(
  doneCards: number,
  excludedCards: number,
  totalCards: number
): number {
  const denominator = totalCards - excludedCards
  return denominator > 0 ? Math.round((doneCards / denominator) * 100) : 0
}

/**
 * 기한 초과 여부 확인
 */
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

/**
 * 파일 크기 포맷
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
