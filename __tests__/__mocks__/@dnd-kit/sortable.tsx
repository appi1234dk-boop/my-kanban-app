import React from 'react'
import { vi } from 'vitest'

export const SortableContext = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const useSortable = vi.fn(() => ({
  attributes: {},
  listeners: {},
  setNodeRef: vi.fn(),
  transform: null,
  transition: undefined,
  isDragging: false,
}))
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}
export const verticalListSortingStrategy = vi.fn()
export const horizontalListSortingStrategy = vi.fn()
