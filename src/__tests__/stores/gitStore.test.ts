import { describe, it, expect, beforeEach } from 'vitest'
import { useGitStore } from '@/stores/gitStore'

describe('gitStore', () => {
  beforeEach(() => {
    useGitStore.setState({ status: null, diff: '', loading: false, error: null })
  })

  it('starts with null status', () => {
    expect(useGitStore.getState().status).toBeNull()
  })

  it('clears state', () => {
    useGitStore.setState({
      status: { branch: 'main', clean: true, files: [], ahead: 0, behind: 0, recent_commits: [] },
      diff: 'some diff',
    })
    useGitStore.getState().clear()
    expect(useGitStore.getState().status).toBeNull()
    expect(useGitStore.getState().diff).toBe('')
  })
})
