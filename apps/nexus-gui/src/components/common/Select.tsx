/**
 * Modern Select Component
 * Custom dropdown with search and keyboard navigation
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../hooks/useLanguage';

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  description?: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  searchable?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  fullWidth = false,
  leftIcon,
  searchable,
  size = 'md',
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredOptionValue, setHoveredOptionValue] = useState<string | number | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { copy } = useLanguage();
  const selectCopy = copy.common.select;
  const resolvedPlaceholder = placeholder ?? selectCopy.defaultPlaceholder;
  const showSearch = searchable ?? options.length > 8;

  const isSameValue = (left: string | number | undefined, right: string | number | undefined) =>
    left !== undefined && right !== undefined && String(left) === String(right);

  const selectedOption = options.find((opt) => isSameValue(opt.value, value));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedTrigger = containerRef.current?.contains(targetNode);
      const clickedMenu = menuRef.current?.contains(targetNode);

      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
        setSearch('');
        setHoveredOptionValue(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
    setHoveredOptionValue(null);
  };

  const updatePlacement = () => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const minMenuSpace = 200;

    if (spaceBelow < minMenuSpace && spaceAbove > spaceBelow) {
      setPlacement('top');
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + 8,
      });
      return;
    }

    setPlacement('bottom');
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 8,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
        setHoveredOptionValue(null);
      }
    };

    const handleViewportChange = () => updatePlacement();

    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen]);

  const triggerSizeClass = size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-3.5 text-sm';

  return (
    <div ref={containerRef} className={clsx('relative', fullWidth && 'w-full', className)}>
      {/* Label */}
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) {
              setSearch('');
              setHoveredOptionValue(null);
            }
            return next;
          });
        }}
        disabled={disabled}
        className={clsx(
          'flex items-center justify-between gap-2',
          'group w-full rounded-xl border text-text-primary backdrop-blur-[2px] transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          triggerSizeClass,
          error
            ? 'border-accent-red focus-visible:ring-accent-red/30'
            : isOpen
              ? 'border-accent-blue/50 bg-bg-hover/80 shadow-[0_0_0_1px_rgba(59,130,246,0.2)] focus-visible:ring-accent-blue/30'
              : 'border-theme bg-bg-tertiary/85 focus-visible:ring-accent-blue/30',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-accent-blue/35 hover:bg-bg-hover/75'
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {leftIcon && <span className="text-text-muted">{leftIcon}</span>}
          {selectedOption?.icon}
          <span className={clsx('truncate', !selectedOption && 'text-text-muted')}>
            {selectedOption?.label || resolvedPlaceholder}
          </span>
        </span>
        <ChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-text-muted transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-accent-red">{error}</p>
      )}

      {/* Dropdown */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && menuStyle && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: placement === 'bottom' ? -8 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: placement === 'bottom' ? -8 : 8 }}
                transition={{ duration: 0.14 }}
                style={menuStyle}
                className="z-[500] overflow-hidden rounded-xl border border-theme bg-white shadow-[0_20px_48px_rgba(2,6,23,0.26)] dark:bg-slate-950"
              >
                {/* Search Input */}
                {showSearch && (
                  <div className="border-b border-theme p-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={selectCopy.searchPlaceholder}
                      autoFocus
                      className="h-9 w-full rounded-lg border border-theme bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                    />
                  </div>
                )}

                {/* Options List */}
                <div
                  className="max-h-64 overflow-y-auto px-1 py-1"
                  onMouseLeave={() => setHoveredOptionValue(null)}
                >
                  {filteredOptions.length === 0 ? (
                    <div className="px-4 py-3 text-center text-sm text-text-muted">
                      {selectCopy.noOptionsFound}
                    </div>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = isSameValue(option.value, value);
                      const isHovered =
                        hoveredOptionValue !== null &&
                        String(hoveredOptionValue) === String(option.value);

                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          disabled={option.disabled}
                          onMouseEnter={() => {
                            if (!option.disabled) {
                              setHoveredOptionValue(option.value);
                            }
                          }}
                          onClick={() => !option.disabled && handleSelect(option.value)}
                          className={clsx(
                            'relative flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                            option.disabled && 'cursor-not-allowed opacity-50',
                            !option.disabled && 'cursor-pointer active:bg-accent-blue/15',
                            isSelected
                              ? 'bg-accent-blue/20 text-accent-blue ring-1 ring-inset ring-accent-blue/35'
                              : isHovered
                                ? 'bg-bg-hover text-text-primary ring-1 ring-inset ring-accent-blue/25'
                                : 'text-text-primary'
                          )}
                        >
                          <span
                            className={clsx(
                              'absolute inset-y-1.5 left-0 w-0.5 rounded-r-full transition-opacity',
                              isSelected || isHovered ? 'bg-accent-blue/80 opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="flex min-w-0 items-center gap-2">
                            {option.icon}
                            <span className="truncate">{option.label}</span>
                            {option.description && (
                              <span className="truncate text-xs text-text-muted">{option.description}</span>
                            )}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-accent-blue" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
