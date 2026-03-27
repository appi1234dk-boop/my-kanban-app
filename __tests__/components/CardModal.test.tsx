import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardModal from '@/components/board/CardModal'
import { buildCard, buildColumn, buildMember, buildTag } from '../fixtures'

vi.mock('@/lib/auth/context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', nickname: '테스터', avatar_url: null },
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  })),
}))

vi.mock('@/lib/supabase/queries', () => ({
  createComment: vi.fn().mockResolvedValue({
    id: 'c-new',
    content: '테스트 댓글',
    created_at: new Date().toISOString(),
    author: { id: 'user-1', nickname: '테스터', avatar_url: null },
  }),
  deleteComment: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => null),
  EditorContent: () => <div data-testid="tiptap-editor" />,
}))
vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-task-list', () => ({ default: {} }))
vi.mock('@tiptap/extension-task-item', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))

const member = buildMember({ id: 'm-1', name: '홍길동' })
const column = buildColumn({ id: 'col-1', title: '대기' })

const defaultProps = {
  card: null,
  columnId: 'col-1',
  columns: [column],
  allTags: [],
  allMembers: [member],
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onSaveTag: vi.fn(),
  onClose: vi.fn(),
}

describe('CardModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── 타이틀 표시 ────────────────────────────────────────────────────────────

  it('card가 null이면 "카드 추가" 타이틀을 표시한다', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: '카드 추가' })).toBeInTheDocument()
  })

  it('card가 있으면 "카드 상세" 타이틀을 표시한다', () => {
    const card = buildCard({ title: '기존 카드' })
    render(<CardModal {...defaultProps} card={card} />)
    expect(screen.getByRole('heading', { name: '카드 상세' })).toBeInTheDocument()
  })

  // ── 저장 ──────────────────────────────────────────────────────────────────

  it('제목이 없으면 저장 버튼이 비활성화된다', () => {
    render(<CardModal {...defaultProps} />)
    const saveBtn = screen.getByRole('button', { name: '카드 추가' })
    expect(saveBtn).toBeDisabled()
  })

  it('제목을 입력하면 저장 버튼이 활성화된다', async () => {
    const user = userEvent.setup()
    render(<CardModal {...defaultProps} />)
    await user.type(screen.getByPlaceholderText('카드 제목을 입력하세요'), '새 작업')
    expect(screen.getByRole('button', { name: '카드 추가' })).not.toBeDisabled()
  })

  it('저장 시 onSave가 올바른 card 데이터로 호출된다', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardModal {...defaultProps} onSave={onSave} />)
    await user.type(screen.getByPlaceholderText('카드 제목을 입력하세요'), '새 작업')
    await user.click(screen.getByRole('button', { name: '카드 추가' }))
    expect(onSave).toHaveBeenCalledOnce()
    const saved = onSave.mock.calls[0][0]
    expect(saved.title).toBe('새 작업')
    expect(saved.column_id).toBe('col-1')
  })

  // ── 닫기 ──────────────────────────────────────────────────────────────────

  it('취소 버튼 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CardModal {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape 키 입력 시 onClose가 호출된다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CardModal {...defaultProps} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  // ── 삭제 ──────────────────────────────────────────────────────────────────

  it('카드 삭제 버튼 클릭 시 확인 UI가 표시된다', async () => {
    const user = userEvent.setup()
    const card = buildCard({ title: '삭제할 카드' })
    render(<CardModal {...defaultProps} card={card} />)
    await user.click(screen.getByRole('button', { name: '카드 삭제' }))
    expect(screen.getByText('삭제하면 되돌릴 수 없습니다.')).toBeInTheDocument()
  })

  it('삭제 확인 시 onDelete가 cardId와 함께 호출된다', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const card = buildCard({ id: 'card-to-delete', title: '삭제할 카드' })
    render(<CardModal {...defaultProps} card={card} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: '카드 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    expect(onDelete).toHaveBeenCalledWith('card-to-delete')
  })

  it('삭제 취소 시 확인 UI가 사라진다', async () => {
    const user = userEvent.setup()
    const card = buildCard({ title: '삭제할 카드' })
    render(<CardModal {...defaultProps} card={card} />)
    await user.click(screen.getByRole('button', { name: '카드 삭제' }))
    // 삭제 확인 영역의 취소 버튼 (footer의 취소와 구분)
    const cancelButtons = screen.getAllByRole('button', { name: '취소' })
    await user.click(cancelButtons[0])
    expect(screen.queryByText('삭제하면 되돌릴 수 없습니다.')).not.toBeInTheDocument()
  })

  // ── 댓글 ──────────────────────────────────────────────────────────────────

  it('댓글을 추가하면 댓글 목록에 표시된다', async () => {
    const user = userEvent.setup()
    render(<CardModal {...defaultProps} />)
    await user.type(
      screen.getByPlaceholderText('댓글을 입력하세요... (Cmd+Enter로 제출)'),
      '테스트 댓글'
    )
    await user.click(screen.getByRole('button', { name: '댓글 추가' }))
    expect(screen.getByText('테스트 댓글')).toBeInTheDocument()
  })

  // ── 태그 ──────────────────────────────────────────────────────────────────

  it('기존 태그를 클릭하면 선택 상태가 토글된다', async () => {
    const user = userEvent.setup()
    const tag = buildTag({ id: 'tag-1', title: '버그' })
    const card = buildCard({ tags: [] })
    render(<CardModal {...defaultProps} card={card} allTags={[tag]} />)
    // 태그 버튼 클릭 (선택)
    await user.click(screen.getByText('버그'))
    // 저장 후 태그가 포함되어 있는지 확인
    const titleInput = screen.getByDisplayValue(card.title)
    await user.clear(titleInput)
    await user.type(titleInput, card.title)
    await user.click(screen.getByRole('button', { name: '저장' }))
    const onSave = defaultProps.onSave as ReturnType<typeof vi.fn>
    const saved = onSave.mock.calls[0]?.[0]
    expect(saved?.tags).toContainEqual(expect.objectContaining({ id: 'tag-1' }))
  })

  it('새 태그 패널을 열고 태그를 추가하면 onSaveTag가 호출된다', async () => {
    const user = userEvent.setup()
    const onSaveTag = vi.fn()
    render(<CardModal {...defaultProps} onSaveTag={onSaveTag} />)
    await user.click(screen.getByText('새 태그'))
    await user.type(screen.getByPlaceholderText('태그 이름'), '신규태그')
    await user.click(screen.getByRole('button', { name: '추가' }))
    await waitFor(() => {
      expect(onSaveTag).toHaveBeenCalledOnce()
      expect(onSaveTag.mock.calls[0][0].title).toBe('신규태그')
    })
  })
})
