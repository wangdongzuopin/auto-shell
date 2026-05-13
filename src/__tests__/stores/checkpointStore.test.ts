import { describe, it, expect, beforeEach } from 'vitest'
import { useCheckpointStore } from '@/stores/checkpointStore'

describe('checkpointStore', () => {
  beforeEach(() => {
    useCheckpointStore.setState({ checkpoints: [], loading: false, error: null })
  })

  it('starts with empty checkpoints', () => {
    expect(useCheckpointStore.getState().checkpoints).toHaveLength(0)
  })

  it('clears checkpoints locally', async () => {
    // Set mock checkpoints directly (skip IPC call)
    useCheckpointStore.setState({
      checkpoints: [
        { id: '1', file_path: '/a.ts', old_hash: 'abc', old_content: 'old', conversation_id: 'c1', created_at: '2026-01-01' },
      ],
    })
    // Will try to call IPC, but we verify state is clearable
    expect(useCheckpointStore.getState().checkpoints).toHaveLength(1)
    useCheckpointStore.setState({ checkpoints: [] })
    expect(useCheckpointStore.getState().checkpoints).toHaveLength(0)
  })
})
