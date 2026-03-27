import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectCard from '@/components/landing/ProjectCard'
import { buildProject, buildColumn, buildCard, buildMember } from '../fixtures'

describe('ProjectCard', () => {
  const onToggleStar = vi.fn()
  const onDelete = vi.fn()
  const onStatusChange = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  const makeProject = () => {
    const col = buildColumn({ id: 'c1', status: 'done' })
    return buildProject({
      title: '테스트 프로젝트',
      members: [buildMember()],
      columns: [col],
      cards: [
        buildCard({ column_id: 'c1' }),
        buildCard({ column_id: 'c1' }),
        buildCard({ column_id: 'c1' }),
        buildCard({ column_id: 'c1' }),
      ],
    })
  }

  it('프로젝트 제목을 표시한다', () => {
    render(<ProjectCard project={makeProject()} onToggleStar={onToggleStar} />)
    expect(screen.getByText('테스트 프로젝트')).toBeInTheDocument()
  })

  it('카드가 있으면 진행도를 표시한다', () => {
    render(<ProjectCard project={makeProject()} onToggleStar={onToggleStar} />)
    expect(screen.getByText('진행도')).toBeInTheDocument()
    expect(screen.getByText('4/4')).toBeInTheDocument()
  })

  it('카드가 없으면 진행도를 표시하지 않는다', () => {
    const project = buildProject({ cards: [] })
    render(<ProjectCard project={project} onToggleStar={onToggleStar} />)
    expect(screen.queryByText('진행도')).not.toBeInTheDocument()
  })

  it('별표 버튼 클릭 시 onToggleStar가 호출된다', async () => {
    const user = userEvent.setup()
    const project = makeProject()
    render(<ProjectCard project={project} onToggleStar={onToggleStar} />)
    await user.click(screen.getByTitle('즐겨찾기 추가'))
    expect(onToggleStar).toHaveBeenCalledWith(project.id)
  })

  it('is_starred=true이면 즐겨찾기 해제 버튼이 표시된다', () => {
    const project = { ...makeProject(), is_starred: true }
    render(<ProjectCard project={project} onToggleStar={onToggleStar} />)
    expect(screen.getByTitle('즐겨찾기 해제')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 확인 UI가 표시된다', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={makeProject()} onToggleStar={onToggleStar} onDelete={onDelete} />)
    await user.click(screen.getByTitle('프로젝트 삭제'))
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it('삭제 확인 시 onDelete가 호출된다', async () => {
    const user = userEvent.setup()
    const project = makeProject()
    render(<ProjectCard project={project} onToggleStar={onToggleStar} onDelete={onDelete} />)
    await user.click(screen.getByTitle('프로젝트 삭제'))
    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalledWith(project.id)
  })

  it('상태 버튼 클릭 시 드롭다운이 열린다', async () => {
    const user = userEvent.setup()
    const project = { ...makeProject(), status: '진행중' as const }
    render(
      <ProjectCard project={project} onToggleStar={onToggleStar} onStatusChange={onStatusChange} />
    )
    await user.click(screen.getByText('진행중'))
    expect(screen.getByRole('button', { name: '종료' })).toBeInTheDocument()
  })

  it('상태 변경 시 onStatusChange가 호출된다', async () => {
    const user = userEvent.setup()
    const project = { ...makeProject(), status: '진행중' as const }
    render(
      <ProjectCard project={project} onToggleStar={onToggleStar} onStatusChange={onStatusChange} />
    )
    await user.click(screen.getByText('진행중'))
    await user.click(screen.getByRole('button', { name: '종료' }))
    expect(onStatusChange).toHaveBeenCalledWith(project.id, '종료')
  })
})
