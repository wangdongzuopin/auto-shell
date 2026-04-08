// src/components/ModelSelector/ModelSelector.tsx

import React, { useState, useRef, useEffect } from 'react'
import { useSettingsStore } from '../../renderer/store/settings'
import { getAllModelPresets, MODEL_PRESETS } from '../../ai/models'
import './ModelSelector.css'

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const aiSettings = useSettingsStore((s) => s.aiSettings)
  const setProvider = useSettingsStore((s) => s.setProvider)
  const setProviderConfig = useSettingsStore((s) => s.setProviderConfig)

  const currentModel = aiSettings.configs[aiSettings.provider]?.model || 'MiniMax-M2.7'
  const currentPreset = MODEL_PRESETS[currentModel]
  const models = getAllModelPresets()

  const getDisplayName = () => {
    if (currentPreset) {
      return currentPreset.name.replace(/Claude /i, '')
    }
    return currentModel
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleModelSelect = async (modelId: string) => {
    const preset = MODEL_PRESETS[modelId]
    if (!preset) return

    const brandToProvider: Record<string, ProviderType> = {
      'Anthropic': 'claude',
      'OpenAI': 'openai',
      'MiniMax': 'minimax',
      'Zhipu': 'glm',
      'Ollama': 'ollama',
    }

    const providerType = brandToProvider[preset.brand] || aiSettings.provider
    await setProvider(providerType)
    await setProviderConfig(providerType, {
      baseUrl: preset.baseUrl,
      model: preset.id,
    })

    onModelChange?.(modelId)
    setIsOpen(false)
  }

  return (
    <div className="model-selector-container" ref={dropdownRef}>
      <button className="model-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="model-name">{getDisplayName()}</span>
        <svg className={`chevron ${isOpen ? 'open' : ''}`} width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="model-selector-dropdown">
          {models.map((model) => (
            <button
              key={model.id}
              className={`model-option ${model.id === currentModel ? 'active' : ''}`}
              onClick={() => handleModelSelect(model.id)}
            >
              <span className="model-option-name">{model.name}</span>
              <span className="model-option-brand">{model.brand}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type ProviderType = 'minimax' | 'glm' | 'claude' | 'openai' | 'ollama' | 'openaiCompatible'
