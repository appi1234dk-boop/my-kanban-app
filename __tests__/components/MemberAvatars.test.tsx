import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberAvatars from '@/components/landing/MemberAvatars'
import { buildMember } from '../fixtures'

describe('MemberAvatars', () => {
  it('max 이하이면 모두 표시하고 +N은 없다', () => {
    const members = [
      buildMember({ avatar: 'A', name: '멤버A' }),
      buildMember({ avatar: 'B', name: '멤버B' }),
    ]
    render(<MemberAvatars members={members} max={3} />)
    expect(screen.getByTitle('멤버A')).toBeInTheDocument()
    expect(screen.getByTitle('멤버B')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('max 초과 시 +N 표시한다', () => {
    const members = [
      buildMember({ avatar: 'A' }),
      buildMember({ avatar: 'B' }),
      buildMember({ avatar: 'C' }),
      buildMember({ avatar: 'D' }),
      buildMember({ avatar: 'E' }),
    ]
    render(<MemberAvatars members={members} max={3} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('members가 비어있으면 아무것도 표시하지 않는다', () => {
    const { container } = render(<MemberAvatars members={[]} />)
    expect(container.firstChild?.childNodes.length).toBe(0)
  })

  it('max와 members가 같으면 +N이 없다', () => {
    const members = [buildMember(), buildMember(), buildMember()]
    render(<MemberAvatars members={members} max={3} />)
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })
})
