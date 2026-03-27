import type { Card, Column, Project, Member, Tag, Comment, Profile } from '@/lib/types'

let _counter = 0
const uid = () => String(++_counter)

export function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: `m-${uid()}`,
    name: '테스트유저',
    avatar: '테',
    color: '#6366f1',
    ...overrides,
  }
}

export function buildTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: `tag-${uid()}`,
    title: '태그',
    color: '#ef4444',
    ...overrides,
  }
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: `u-${uid()}`,
    nickname: '테스트유저',
    avatar_url: null,
    ...overrides,
  }
}

export function buildComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: `cmt-${uid()}`,
    author: buildProfile(),
    content: '테스트 댓글',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function buildCard(overrides: Partial<Card> = {}): Card {
  return {
    id: `card-${uid()}`,
    column_id: 'col-1',
    title: '테스트 카드',
    description: '',
    body: '',
    due_date: null,
    assignee: null,
    stakeholders: [],
    tags: [],
    position: 1000,
    created_at: '2026-01-01T00:00:00Z',
    comments: [],
    attachments: [],
    ...overrides,
  }
}

export function buildColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: `col-${uid()}`,
    title: '테스트 컬럼',
    position: 1000,
    color: '#94a3b8',
    status: 'none',
    ...overrides,
  }
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  const col = buildColumn({ id: 'default-col', position: 1000 })
  return {
    id: `p-${uid()}`,
    title: '테스트 프로젝트',
    description: '테스트용 프로젝트입니다',
    members: [buildMember()],
    is_starred: false,
    is_ended: false,
    status: '진행중',
    created_at: '2026-01-01T00:00:00Z',
    owner_id: null,
    columns: [col],
    cards: [],
    ...overrides,
  }
}
