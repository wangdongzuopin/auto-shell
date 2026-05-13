import { describe, it, expect, beforeEach } from 'vitest'
import { useDiffStore } from '@/stores/diffStore'

describe('diffStore', () => {
  beforeEach(() => {
    useDiffStore.setState({ diffs: [] })
  })

  it('adds a diff entry with auto-generated id and timestamp', () => {
    useDiffStore.getState().addDiff({
      path: '/test/file.ts',
      content: 'new content',
      operation: 'modify',
      conversationId: 'conv-1',
    })

    const diffs = useDiffStore.getState().diffs
    expect(diffs).toHaveLength(1)
    expect(diffs[0].path).toBe('/test/file.ts')
    expect(diffs[0].content).toBe('new content')
    expect(diffs[0].operation).toBe('modify')
    expect(diffs[0].conversationId).toBe('conv-1')
    expect(diffs[0].id).toBeTruthy()
    expect(diffs[0].timestamp).toBeGreaterThan(0)
  })

  it('clears diffs for a specific conversation', () => {
    useDiffStore.getState().addDiff({
      path: '/a.ts', content: 'a', operation: 'add', conversationId: 'conv-1',
    })
    useDiffStore.getState().addDiff({
      path: '/b.ts', content: 'b', operation: 'add', conversationId: 'conv-2',
    })

    useDiffStore.getState().clearDiffs('conv-1')
    const diffs = useDiffStore.getState().diffs
    expect(diffs).toHaveLength(1)
    expect(diffs[0].conversationId).toBe('conv-2')
  })

  it('clears all diffs when no conversation specified', () => {
    useDiffStore.getState().addDiff({
      path: '/a.ts', content: 'a', operation: 'add', conversationId: 'conv-1',
    })
    useDiffStore.getState().addDiff({
      path: '/b.ts', content: 'b', operation: 'add', conversationId: 'conv-2',
    })

    useDiffStore.getState().clearDiffs()
    expect(useDiffStore.getState().diffs).toHaveLength(0)
  })

  it('gets diffs by conversation', () => {
    useDiffStore.getState().addDiff({
      path: '/a.ts', content: 'a', operation: 'add', conversationId: 'conv-1',
    })
    useDiffStore.getState().addDiff({
      path: '/b.ts', content: 'b', operation: 'add', conversationId: 'conv-2',
    })

    const result = useDiffStore.getState().getByConversation('conv-1')
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('/a.ts')
  })

  it('returns empty array for unknown conversation', () => {
    const result = useDiffStore.getState().getByConversation('nonexistent')
    expect(result).toHaveLength(0)
  })
})
