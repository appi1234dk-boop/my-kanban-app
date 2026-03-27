import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildProject, buildColumn, buildCard, buildMember } from '../fixtures'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  closestCorners: vi.fn(),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  },
  horizontalListSortingStrategy: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}))

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => null),
  EditorContent: () => <div data-testid="tiptap-editor" />,
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-task-list', () => ({ default: {} }))
vi.mock('@tiptap/extension-task-item', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
vi.mock('@/lib/supabase/queries', () => ({
  upsertCard: vi.fn().mockResolvedValue(undefined),
  deleteCard: vi.fn().mockResolvedValue(undefined),
  upsertTag: vi.fn().mockResolvedValue(undefined),
}))

import KanbanBoard from '@/components/board/KanbanBoard'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KanbanBoard', () => {
  const member = buildMember({ id: 'member-1', name: '테스트멤버' })

  const makeProject = () =>
    buildProject({
      members: [member],
      columns: [
        buildColumn({ id: 'col-todo', title: '대기', position: 1000, status: 'none' }),
        buildColumn({ id: 'col-done', title: '완료', position: 2000, status: 'done' }),
      ],
      cards: [
        buildCard({ id: 'card-1', column_id: 'col-todo', title: '작업 1', position: 2000 }),
        buildCard({ id: 'card-2', column_id: 'col-done', title: '작업 2', position: 1000 }),
      ],
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 렌더링 ─────────────────────────────────────────────────────────────────

  it('모든 컬럼을 렌더링한다', () => {
    render(<KanbanBoard project={makeProject()} />)
    expect(screen.getByText('대기')).toBeInTheDocument()
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('카드를 렌더링한다', () => {
    render(<KanbanBoard project={makeProject()} />)
    expect(screen.getByText('작업 1')).toBeInTheDocument()
    expect(screen.getByText('작업 2')).toBeInTheDocument()
  })

  it('"Add New Column" 버튼이 존재한다', () => {
    render(<KanbanBoard project={makeProject()} />)
    expect(screen.getByText('Add New Column')).toBeInTheDocument()
  })

  // ── 컬럼 추가 ──────────────────────────────────────────────────────────────

  it('Add New Column 클릭 시 새 컬럼이 추가된다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)
    await user.click(screen.getByText('Add New Column'))
    expect(screen.getByText('새 컬럼')).toBeInTheDocument()
  })

  // ── 카드 모달 열기 ─────────────────────────────────────────────────────────

  it('Add New Task 클릭 시 카드 추가 모달이 열린다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)
    const addButtons = screen.getAllByText('Add New Task')
    await user.click(addButtons[0])
    expect(screen.getByRole('heading', { name: '카드 추가' })).toBeInTheDocument()
  })

  it('카드 클릭 시 카드 상세 모달이 열린다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)
    await user.click(screen.getByText('작업 1'))
    expect(screen.getByText('카드 상세')).toBeInTheDocument()
  })

  // ── 카드 CRUD ──────────────────────────────────────────────────────────────

  it('새 카드를 저장하면 카드 목록에 추가된다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)

    await user.click(screen.getAllByText('Add New Task')[0])
    await user.type(screen.getByPlaceholderText('카드 제목을 입력하세요'), '새 작업')
    await user.click(screen.getByRole('button', { name: '카드 추가' }))

    await waitFor(() => {
      expect(screen.getByText('새 작업')).toBeInTheDocument()
    })
  })

  it('카드를 수정하면 제목이 업데이트된다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)

    await user.click(screen.getByText('작업 1'))
    const titleInput = screen.getByDisplayValue('작업 1')
    await user.clear(titleInput)
    await user.type(titleInput, '수정된 작업')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(screen.getByText('수정된 작업')).toBeInTheDocument()
    })
  })

  it('카드를 삭제하면 목록에서 사라진다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)

    await user.click(screen.getByText('작업 1'))
    await user.click(screen.getByRole('button', { name: '카드 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))

    await waitFor(() => {
      expect(screen.queryByText('작업 1')).not.toBeInTheDocument()
    })
  })

  // ── 진행률 콜백 ────────────────────────────────────────────────────────────

  it('마운트 시 onProgressChange를 올바른 값으로 호출한다', () => {
    const onProgressChange = vi.fn()
    render(<KanbanBoard project={makeProject()} onProgressChange={onProgressChange} />)
    // col-done(status=done)에 카드 1개, 전체 2개, 제외 0개
    expect(onProgressChange).toHaveBeenCalledWith(1, 0, 2)
  })

  it('카드 추가 후 onProgressChange 값이 업데이트된다', async () => {
    const user = userEvent.setup()
    const onProgressChange = vi.fn()
    render(<KanbanBoard project={makeProject()} onProgressChange={onProgressChange} />)

    // 완료 컬럼에 카드 추가
    const addButtons = screen.getAllByText('Add New Task')
    await user.click(addButtons[1]) // 두 번째 컬럼 = 완료
    await user.type(screen.getByPlaceholderText('카드 제목을 입력하세요'), '완료 작업')
    await user.click(screen.getByRole('button', { name: '카드 추가' }))

    await waitFor(() => {
      const calls = onProgressChange.mock.calls
      const lastCall = calls[calls.length - 1]
      // done: 2, excluded: 0, total: 3
      expect(lastCall).toEqual([2, 0, 3])
    })
  })

  // ── 모달 닫기 ──────────────────────────────────────────────────────────────

  it('취소 버튼 클릭 시 모달이 닫힌다', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard project={makeProject()} />)
    await user.click(screen.getAllByText('Add New Task')[0])
    expect(screen.getByRole('heading', { name: '카드 추가' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '카드 추가' })).not.toBeInTheDocument()
    })
  })
})
