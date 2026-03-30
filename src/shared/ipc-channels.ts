export const IPC = {
  // AI
  AI_CHAT:            'ai:chat',
  AI_CHAT_STREAM_START: 'ai:chat-stream:start',
  AI_CHAT_STREAM_CHUNK: 'ai:chat-stream:chunk',
  AI_CHAT_STREAM_DONE:  'ai:chat-stream:done',
  AI_CHAT_STREAM_ERROR: 'ai:chat-stream:error',
  AI_EXPLAIN_ERROR:   'ai:explain-error',
  AI_NATURAL_CMD:     'ai:natural-cmd',
  AI_EXPLAIN_CMD:     'ai:explain-cmd',
  AI_COMPLETION:      'ai:completion',
  AI_CHECK_AVAILABLE: 'ai:check-available',

  // Config
  CONFIG_GET:                 'config:get',
  CONFIG_SET_PROVIDER:        'config:set-provider',
  CONFIG_SET_PROVIDER_CONFIG: 'config:set-provider-config',
  CONFIG_SET_THEME:           'config:set-theme',
  CONFIG_SET_FEATURES:        'config:set-features',
  KEY_SAVE:                   'key:save',
  KEY_GET:                    'key:get',

  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE:    'window:close',
} as const;
