import { describe, it, expect, vi } from 'vitest'
import {
  mapCard,
  mapProject,
  getProject,
  deleteProject,
  toggleProjectStar,
  updateProjectStatus,
  linkMemberToProject,
  unlinkMemberFromProject,
  upsertMemberForUser,
} from '@/lib/supabase/queries'
import type { RawCard, RawProject, RawMember } from '@/lib/supabase/queries'

// ─── Supabase mock helpers ────────────────────────────────────────────────────

function makeChain(resolvedValue: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'single']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  // single and the final awaitable resolves to { data, error }
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: resolvedValue, error })
  // For non-single calls (like delete().eq()) that are directly awaited
  chain._resolve = vi.fn().mockResolvedValue({ data: resolvedValue, error })
  return chain
}

function makeClient(resolvedValue: unknown = null, error: unknown = null) {
  const chain = makeChain(resolvedValue, error)
  // Make the chain thenable (so await client.from(...).delete().eq() works)
  const thenable = {
    ...chain,
    then: (chain._resolve as ReturnType<typeof vi.fn>).mockImplementation(
      (resolve: (v: { data: unknown; error: unknown }) => void) =>
        Promise.resolve({ data: resolvedValue, error }).then(resolve)
    ),
  }
  Object.keys(chain).forEach((k) => {
    if (k !== '_resolve' && k !== 'then') {
      (thenable[k] as ReturnType<typeof vi.fn>) = vi.fn().mockReturnValue(thenable)
    }
  })
  return {
    from: vi.fn().mockReturnValue(thenable),
    _chain: thenable,
  }
}

// ─── Raw data builders ────────────────────────────────────────────────────────

function buildRawMember(overrides: Partial<RawMember> = {}): RawMember {
  return { id: 'm-1', name: '홍길동', avatar: '홍', color: '#6366f1', ...overrides }
}

function buildRawCard(overrides: Partial<RawCard> = {}): RawCard {
  return {
    id: 'card-1',
    column_id: 'col-1',
    title: '테스트 카드',
    description: '',
    body: '',
    due_date: null,
    position: 1000,
    created_at: '2026-01-01T00:00:00Z',
    assignee: null,
    card_stakeholders: [],
    card_tags: [],
    comments: [],
    attachments: [],
    ...overrides,
  }
}

function buildRawProject(overrides: Partial<RawProject> = {}): RawProject {
  return {
    id: 'p-1',
    title: '테스트 프로젝트',
    description: '설명',
    is_starred: false,
    is_ended: false,
    status: '진행중',
    created_at: '2026-01-01T00:00:00Z',
    owner_id: null,
    project_members: [{ members: buildRawMember() }],
    columns: [
      {
        id: 'col-1',
        title: '대기',
        position: 1000,
        color: '#94a3b8',
        status: null,
        cards: [buildRawCard()],
      },
    ],
    ...overrides,
  }
}

// ─── mapCard ─────────────────────────────────────────────────────────────────

describe('mapCard', () => {
  it('기본 필드를 올바르게 매핑한다', () => {
    const raw = buildRawCard({ title: '테스트', due_date: '2026-06-01' })
    const card = mapCard(raw)
    expect(card.id).toBe('card-1')
    expect(card.title).toBe('테스트')
    expect(card.due_date).toBe('2026-06-01')
    expect(card.stakeholders).toEqual([])
    expect(card.tags).toEqual([])
    expect(card.comments).toEqual([])
    expect(card.attachments).toEqual([])
  })

  it('assignee를 올바르게 매핑한다', () => {
    const raw = buildRawCard({ assignee: buildRawMember({ name: '김철수' }) })
    const card = mapCard(raw)
    expect(card.assignee?.name).toBe('김철수')
  })

  it('card_stakeholders를 flatMap으로 정리한다', () => {
    const raw = buildRawCard({
      card_stakeholders: [
        { members: buildRawMember({ id: 'm-a' }) },
        { members: null },
        { members: buildRawMember({ id: 'm-b' }) },
      ],
    })
    const card = mapCard(raw)
    expect(card.stakeholders).toHaveLength(2)
    expect(card.stakeholders.map((m) => m.id)).toEqual(['m-a', 'm-b'])
  })

  it('card_tags를 올바르게 매핑한다', () => {
    const raw = buildRawCard({
      card_tags: [{ tags: { id: 't-1', title: '버그', color: '#ef4444' } }],
    })
    const card = mapCard(raw)
    expect(card.tags).toHaveLength(1)
    expect(card.tags[0].title).toBe('버그')
  })
})

// ─── mapProject ───────────────────────────────────────────────────────────────

describe('mapProject', () => {
  it('프로젝트 기본 필드를 올바르게 매핑한다', () => {
    const raw = buildRawProject()
    const project = mapProject(raw)
    expect(project.id).toBe('p-1')
    expect(project.title).toBe('테스트 프로젝트')
    expect(project.is_starred).toBe(false)
    expect(project.status).toBe('진행중')
  })

  it('members를 project_members에서 추출한다', () => {
    const raw = buildRawProject({
      project_members: [
        { members: buildRawMember({ id: 'm-1' }) },
        { members: buildRawMember({ id: 'm-2' }) },
      ],
    })
    const project = mapProject(raw)
    expect(project.members).toHaveLength(2)
    expect(project.members.map((m) => m.id)).toEqual(['m-1', 'm-2'])
  })

  it('모든 컬럼의 카드를 flat하게 모아준다', () => {
    const raw = buildRawProject({
      columns: [
        {
          id: 'col-1',
          title: '대기',
          position: 1000,
          color: null,
          status: null,
          cards: [buildRawCard({ id: 'c-1' }), buildRawCard({ id: 'c-2' })],
        },
        {
          id: 'col-2',
          title: '완료',
          position: 2000,
          color: '#10b981',
          status: 'done',
          cards: [buildRawCard({ id: 'c-3', column_id: 'col-2' })],
        },
      ],
    })
    const project = mapProject(raw)
    expect(project.cards).toHaveLength(3)
    expect(project.columns).toHaveLength(2)
    expect(project.columns[1].status).toBe('done')
  })

  it('column.color가 null이면 undefined로 매핑한다', () => {
    const raw = buildRawProject({
      columns: [
        { id: 'col-1', title: '대기', position: 1000, color: null, status: null, cards: [] },
      ],
    })
    const project = mapProject(raw)
    expect(project.columns[0].color).toBeUndefined()
  })
})

// ─── getProject ───────────────────────────────────────────────────────────────

describe('getProject', () => {
  it('PGRST116 에러코드는 null을 반환한다', async () => {
    const client = makeClient(null, { code: 'PGRST116', message: 'not found' })
    const { getProject: _getProject } = await import('@/lib/supabase/queries')
    const result = await _getProject(client as never, 'nonexistent-id')
    expect(result).toBeNull()
  })

  it('다른 에러는 throw한다', async () => {
    const client = makeClient(null, { code: '500', message: 'server error' })
    const { getProject: _getProject } = await import('@/lib/supabase/queries')
    await expect(_getProject(client as never, 'some-id')).rejects.toBeTruthy()
  })
})

// ─── Mutations ────────────────────────────────────────────────────────────────

describe('deleteProject', () => {
  it('projects 테이블에서 id로 삭제한다', async () => {
    const client = makeClient()
    await deleteProject(client as never, 'p-1')
    expect(client.from).toHaveBeenCalledWith('projects')
  })
})

describe('toggleProjectStar', () => {
  it('is_starred 값을 업데이트한다', async () => {
    const client = makeClient()
    await toggleProjectStar(client as never, 'p-1', true)
    expect(client.from).toHaveBeenCalledWith('projects')
    const chain = client._chain
    expect(chain.update).toHaveBeenCalledWith({ is_starred: true })
  })
})

describe('updateProjectStatus', () => {
  it('status가 "종료"이면 is_ended: true로 업데이트한다', async () => {
    const client = makeClient()
    await updateProjectStatus(client as never, 'p-1', '종료')
    const chain = client._chain
    expect(chain.update).toHaveBeenCalledWith({ status: '종료', is_ended: true })
  })

  it('status가 "진행중"이면 is_ended: false로 업데이트한다', async () => {
    const client = makeClient()
    await updateProjectStatus(client as never, 'p-1', '진행중')
    const chain = client._chain
    expect(chain.update).toHaveBeenCalledWith({ status: '진행중', is_ended: false })
  })
})

describe('linkMemberToProject', () => {
  it('project_members 테이블에 insert한다', async () => {
    const client = makeClient()
    await linkMemberToProject(client as never, 'p-1', 'm-1')
    expect(client.from).toHaveBeenCalledWith('project_members')
    expect(client._chain.insert).toHaveBeenCalledWith({
      project_id: 'p-1',
      member_id: 'm-1',
    })
  })
})

describe('unlinkMemberFromProject', () => {
  it('project_members 테이블에서 삭제한다', async () => {
    const client = makeClient()
    await unlinkMemberFromProject(client as never, 'p-1', 'm-1')
    expect(client.from).toHaveBeenCalledWith('project_members')
  })
})

describe('upsertMemberForUser', () => {
  it('members 테이블에 upsert하고 member를 반환한다', async () => {
    const member = { id: 'm-new', name: '홍길동', avatar: '홍길', color: '#6366f1' }
    const client = makeClient(member)
    const result = await upsertMemberForUser(client as never, 'user-abc', {
      nickname: '홍길동',
      avatar_url: null,
    })
    expect(client.from).toHaveBeenCalledWith('members')
    expect(client._chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-abc', name: '홍길동', avatar: '홍길' }),
      { onConflict: 'user_id' }
    )
    expect(result).toEqual(member)
  })

  it('닉네임 앞 2글자를 대문자로 avatar에 사용한다', async () => {
    const client = makeClient({ id: 'm-1', name: 'Alice', avatar: 'AL', color: '#6366f1' })
    await upsertMemberForUser(client as never, 'u-1', { nickname: 'Alice', avatar_url: null })
    expect(client._chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: 'AL' }),
      expect.anything()
    )
  })
})
