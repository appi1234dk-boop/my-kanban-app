import React from 'react'
import { vi } from 'vitest'

export const DndContext = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DragOverlay = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const useSensor = vi.fn()
export const useSensors = vi.fn(() => [])
export const PointerSensor = vi.fn()
export const TouchSensor = vi.fn()
export const closestCorners = vi.fn()
export const useDroppable = vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false }))
