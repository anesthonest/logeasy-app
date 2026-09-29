import React, { useState } from 'react';
import { Tag as TagIcon, Plus, X, Palette, Check } from 'lucide-react';
import { ColorTag } from './VoiceJournalTypes';

export const TAG_COLOR_PRESETS = [
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Fuchsia', color: '#d946ef' },
];

export const DEFAULT_SUGGESTED_TAGS: ColorTag[] = [
  { name: 'Reflections', color: '#06b6d4' },
  { name: 'Work', color: '#6366f1' },
  { name: 'Idea', color: '#f59e0b' },
  { name: 'Gratitude', color: '#10b981' },
  { name: 'Wellness', color: '#14b8a6' },
  { name: 'Urgent', color: '#f43f5e' },
  { name: 'Breakthrough', color: '#8b5cf6' },
  { name: 'Personal', color: '#ec4899' },
];

interface ColorTagBadgeProps {
  tag: ColorTag;
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showHash?: boolean;
}

export const ColorTagBadge: React.FC<ColorTagBadgeProps> = ({
  tag,
  onRemove,
  onClick,
  selected = false,
  size = 'sm',
  className = '',
  showHash = true,
}) => {
  if (!tag || !tag.name) return null;
  const color = tag.color || '#06b6d4';

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
  }[size];

  const dotSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      onClick={onClick}
      style={{
        backgroundColor: selected ? `${color}35` : `${color}15`,
        borderColor: selected ? color : `${color}40`,
        color: color,
        boxShadow: selected ? `0 0 10px ${color}40` : undefined,
      }}
      className={`inline-flex items-center font-medium rounded-full border transition-all duration-150 ${sizeStyles} ${
        onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
      } ${className}`}
    >
      <span
        className={`rounded-full shrink-0 ${dotSize}`}
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
      />
      <span className="font-semibold truncate max-w-[120px]">
        {showHash ? '#' : ''}
        {tag.name}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-black/20 text-current opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          title={`Remove #${tag.name}`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
};

interface ColorTagPickerProps {
  tags: ColorTag[];
  onChange: (tags: ColorTag[]) => void;
  availableSuggestions?: ColorTag[];
  placeholder?: string;
  label?: string;
  compact?: boolean;
}

export const ColorTagPicker: React.FC<ColorTagPickerProps> = ({
  tags = [],
  onChange,
  availableSuggestions = DEFAULT_SUGGESTED_TAGS,
  placeholder = 'Add tag (e.g. Work, Focus, Idea)...',
  label = 'Color-Coded Tags',
  compact = false,
}) => {
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLOR_PRESETS[0].color);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const safeTags = Array.isArray(tags) ? tags : [];

  const handleAddTag = () => {
    const trimmed = (tagName || '').trim().replace(/^#+/, '');
    if (!trimmed) return;

    // Check if tag with same name already exists
    const exists = safeTags.some((t) => (t?.name || '').toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      // Just update color if already exists
      onChange(
        safeTags.map((t) =>
          (t?.name || '').toLowerCase() === trimmed.toLowerCase() ? { ...t, color: selectedColor } : t
        )
      );
    } else {
      onChange([...safeTags, { name: trimmed, color: selectedColor }]);
    }

    setTagName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (index: number) => {
    onChange(safeTags.filter((_, i) => i !== index));
  };

  const handleToggleSuggested = (suggested: ColorTag) => {
    const exists = safeTags.some((t) => (t?.name || '').toLowerCase() === suggested.name.toLowerCase());
    if (exists) {
      onChange(safeTags.filter((t) => (t?.name || '').toLowerCase() !== suggested.name.toLowerCase()));
    } else {
      onChange([...safeTags, suggested]);
    }
  };

  // Filter out suggestions already selected
  const unselectedSuggestions = availableSuggestions.filter(
    (s) => !safeTags.some((t) => (t?.name || '').toLowerCase() === s.name.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-gray-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5 text-cyan-400" />
            <span>{label}</span>
          </label>
          <span className="text-[10px] text-gray-500 font-mono">
            {safeTags.length} assigned
          </span>
        </div>
      )}

      {/* Currently Attached Tags */}
      {safeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-gray-500/5 border border-gray-500/10 min-h-[36px] items-center">
          {safeTags.map((tag, idx) => (
            <ColorTagBadge
              key={`${tag.name}-${idx}`}
              tag={tag}
              onRemove={() => handleRemoveTag(idx)}
              size={compact ? 'xs' : 'sm'}
            />
          ))}
        </div>
      )}

      {/* Tag Input + Color Selection Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Color swatch trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 rounded-xl border border-gray-500/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              style={{ backgroundColor: `${selectedColor}25`, borderColor: selectedColor }}
              title="Select tag color"
            >
              <span
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />
            </button>

            {/* Color Palette Popover */}
            {showColorPicker && (
              <div className="absolute left-0 top-10 z-30 p-2.5 bg-[#0e1320] border border-gray-500/20 rounded-2xl shadow-2xl w-56 space-y-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pb-1 border-b border-gray-500/15">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3 h-3 text-cyan-400" /> Custom Palette
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(false)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {/* Swatches Grid */}
                <div className="grid grid-cols-5 gap-1.5">
                  {TAG_COLOR_PRESETS.map((p) => {
                    const isSelected = selectedColor.toLowerCase() === p.color.toLowerCase();
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setSelectedColor(p.color);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                          isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: p.color }}
                        title={p.name}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hex Color Input */}
                <div className="pt-1.5 border-t border-gray-500/15 flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Choose precise custom color"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    placeholder="#06b6d4"
                    className="flex-1 bg-gray-500/10 border border-gray-500/20 rounded-lg px-2 py-1 text-[11px] font-mono text-gray-300 outline-none uppercase"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 outline-none text-xs text-gray-200 focus:border-cyan-400 transition-all font-sans"
            />
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!tagName.trim()}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        {unselectedSuggestions.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] text-gray-500 font-mono block">
              Suggested Tags:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
              {unselectedSuggestions.slice(0, 6).map((suggested) => (
                <button
                  key={suggested.name}
                  type="button"
                  onClick={() => handleToggleSuggested(suggested)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: `${suggested.color}0c`,
                    borderColor: `${suggested.color}35`,
                    color: suggested.color,
                  }}
                  title={`Click to add #${suggested.name}`}
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>#{suggested.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorTagPicker;
