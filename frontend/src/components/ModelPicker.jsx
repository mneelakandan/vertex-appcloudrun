// src/components/ModelPicker.jsx
import React from 'react';

const LABELS = {
  'gemini-1.5-flash':    { short: 'Flash 1.5',  badge: 'FAST' },
  'gemini-1.5-pro':      { short: 'Pro 1.5',    badge: 'SMART' },
  'gemini-2.0-flash-001':{ short: 'Flash 2.0',  badge: 'NEW' },
};

export default function ModelPicker({ models, selected, onChange }) {
  return (
    <div className="model-picker">
      {models.map(m => {
        const info = LABELS[m] || { short: m, badge: '' };
        return (
          <button
            key={m}
            className={`model-btn ${selected === m ? 'model-btn--active' : ''}`}
            onClick={() => onChange(m)}
            title={m}
          >
            {info.short}
            {info.badge && <span className="model-badge">{info.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
