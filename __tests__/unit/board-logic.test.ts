import { describe, it, expect } from 'vitest'
import {
  reorderColumns,
  reorderCardsInColumn,
  moveCardToColumn,
  calcProgress,
  isOverdue,
  formatFileSize,
} from '@/lib/board-logic'
import { buildCard, buildColumn } from '../fixtures'

// ─── reorderColumns ───────────────────────────────────────────────────────────

describe('reorderColumns', () => {
  it('두 번째 컬럼을 첫 번째로 이동하면 position이 재할당된다', () => {
    const cols = [
      buildColumn({ id: 'a', position: 1000 }),
      buildColumn({ id: 'b', position: 2000 }),
      buildColumn({ id: 'c', position: 3000 }),
    ]
    const result = reorderColumns(cols, 'b', 'a')
    expect(result.map((c) => c.id)).toEqual(['b', 'a', 'c'])
    expect(result.map((c) => c.position)).toEqual([1000, 2000, 3000])
  })

  it('첫 번째 컬럼을 마지막으로 이동한다', () => {
    const cols = [
      buildColumn({ id: 'a', position: 1000 }),
      buildColumn({ id: 'b', position: 2000 }),
      buildColumn({ id: 'c', position: 3000 }),
    ]
    const result = reorderColumns(cols, 'a', 'c')
    expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a'])
    expect(result[2].position).toBe(3000)
  })

  it('같은 위치라면 원본 배열을 반환한다', () => {
    const cols = [buildColumn({ id: 'a' }), buildColumn({ id: 'b' })]
    const result = reorderColumns(cols, 'a', 'a')
    expect(result).toBe(cols)
  })

  it('존재하지 않는 ID는 원본 배열을 반환한다', () => {
    const cols = [buildColumn({ id: 'a' })]
    const result = reorderColumns(cols, 'a', 'nonexistent')
    expect(result).toBe(cols)
  })
})

// ─── reorderCardsInColumn ────────────────────────────────────────────────────

describe('reorderCardsInColumn', () => {
  it('같은 컬럼 내에서 카드를 재정렬하고 position을 재할당한다', () => {
    const cards = [
      buildCard({ id: 'c1', column_id: 'col', position: 3000 }),
      buildCard({ id: 'c2', column_id: 'col', position: 2000 }),
      buildCard({ id: 'c3', column_id: 'col', position: 1000 }),
    ]
    // c1(맨 앞) → c3(맨 뒤) 위치로 이동
    const result = reorderCardsInColumn(cards, 'c1', 'c3')
    const sorted = result
      .filter((c) => c.column_id === 'col')
      .sort((a, b) => b.position - a.position)
    expect(sorted.map((c) => c.id)).toEqual(['c2', 'c3', 'c1'])
    expect(sorted.map((c) => c.position)).toEqual([3000, 2000, 1000])
  })

  it('다른 컬럼의 카드는 변경하지 않는다', () => {
    const cards = [
      buildCard({ id: 'c1', column_id: 'col-a', position: 2000 }),
      buildCard({ id: 'c2', column_id: 'col-a', position: 1000 }),
      buildCard({ id: 'other', column_id: 'col-b', position: 1000 }),
    ]
    const result = reorderCardsInColumn(cards, 'c1', 'c2')
    const otherCard = result.find((c) => c.id === 'other')!
    expect(otherCard.column_id).toBe('col-b')
    expect(otherCard.position).toBe(1000)
  })

  it('activeId가 없으면 원본 배열을 반환한다', () => {
    const cards = [buildCard({ id: 'c1', column_id: 'col' })]
    const result = reorderCardsInColumn(cards, 'nonexistent', 'c1')
    expect(result).toBe(cards)
  })

  it('서로 다른 컬럼의 카드끼리는 재정렬하지 않는다', () => {
    const cards = [
      buildCard({ id: 'c1', column_id: 'col-a', position: 1000 }),
      buildCard({ id: 'c2', column_id: 'col-b', position: 1000 }),
    ]
    const result = reorderCardsInColumn(cards, 'c1', 'c2')
    expect(result).toBe(cards)
  })
})

// ─── moveCardToColumn ────────────────────────────────────────────────────────

describe('moveCardToColumn', () => {
  it('해당 카드의 column_id를 변경한다', () => {
    const cards = [
      buildCard({ id: 'c1', column_id: 'col-a' }),
      buildCard({ id: 'c2', column_id: 'col-a' }),
    ]
    const result = moveCardToColumn(cards, 'c1', 'col-b')
    expect(result.find((c) => c.id === 'c1')!.column_id).toBe('col-b')
  })

  it('다른 카드의 column_id는 변경하지 않는다', () => {
    const cards = [
      buildCard({ id: 'c1', column_id: 'col-a' }),
      buildCard({ id: 'c2', column_id: 'col-a' }),
    ]
    const result = moveCardToColumn(cards, 'c1', 'col-b')
    expect(result.find((c) => c.id === 'c2')!.column_id).toBe('col-a')
  })

  it('존재하지 않는 cardId는 아무것도 변경하지 않는다', () => {
    const cards = [buildCard({ id: 'c1', column_id: 'col-a' })]
    const result = moveCardToColumn(cards, 'nonexistent', 'col-b')
    expect(result[0].column_id).toBe('col-a')
  })
})

// ─── calcProgress ────────────────────────────────────────────────────────────

describe('calcProgress', () => {
  it('완료 카드 2개, 전체 4개 → 50%', () => {
    expect(calcProgress(2, 0, 4)).toBe(50)
  })

  it('전체 카드가 0이면 0%를 반환한다 (0으로 나누기 방지)', () => {
    expect(calcProgress(0, 0, 0)).toBe(0)
  })

  it('제외 카드는 분모에서 뺀다', () => {
    // 전체 4, 제외 1 → 분모 3, 완료 3 → 100%
    expect(calcProgress(3, 1, 4)).toBe(100)
  })

  it('모든 카드가 제외되면 0%를 반환한다', () => {
    expect(calcProgress(0, 4, 4)).toBe(0)
  })

  it('완료 0개면 0%', () => {
    expect(calcProgress(0, 0, 5)).toBe(0)
  })
})

// ─── isOverdue ────────────────────────────────────────────────────────────────

describe('isOverdue', () => {
  it('null이면 false를 반환한다', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('과거 날짜는 true를 반환한다', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('미래 날짜는 false를 반환한다', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})

// ─── formatFileSize ───────────────────────────────────────────────────────────

describe('formatFileSize', () => {
  it('1023B → "1023B"', () => {
    expect(formatFileSize(1023)).toBe('1023B')
  })

  it('1024B → "1.0KB"', () => {
    expect(formatFileSize(1024)).toBe('1.0KB')
  })

  it('1MB → "1.0MB"', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0MB')
  })

  it('0B → "0B"', () => {
    expect(formatFileSize(0)).toBe('0B')
  })
})
