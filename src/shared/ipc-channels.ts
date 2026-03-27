export const IPC = {
  // AI
  AI_EXPLAIN_ERROR:   'ai:explain-error',
  AI_NATURAL_CMD:     'ai:natural-cmd',
  AI_EXPLAIN_CMD:     'ai:explain-cmd',
  AI_COMPLETION:      'ai:completion',
  AI_STREAM_CHUNK:    'ai:stream-chunk',
  AI_STREAM_DONE:     'ai:stream-done',
  AI_CHECK_AVAILABLE: 'ai:check-available',

  // Config
  CONFIG_GET:  'config:get',
  CONFIG_SET:  'config:set',
  KEY_SAVE:    'key:save',
  KEY_GET:     'key:get',
} as const;
