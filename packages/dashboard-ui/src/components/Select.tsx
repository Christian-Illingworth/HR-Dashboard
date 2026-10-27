// A dropdown on the kit's .select-trigger + .menu, rebuilt in React as a listbox (kit.js isn't
// used inside the shadow root). Keyboard: Enter, Space or the arrow keys open it; the arrow keys,
// Home and End move; Enter selects; Escape and Tab close it and focus returns to the trigger.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDownIcon } from './icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Teal edge and tint while it's filtering something (kit: .select-trigger.is-filtered). */
  filtered?: boolean;
}

export function Select({ id, label, value, options, onChange, filtered = false }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const close = (e: Event) => {
      if (root.current && !e.composedPath().includes(root.current)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    setOpen(false);
    trigger.current?.focus();
    if (option && option.value !== value) onChange(option.value);
  };

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openAt(selectedIndex);
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, () => void> = {
      ArrowDown: () => setActive((a) => Math.min(last, a + 1)),
      ArrowUp: () => setActive((a) => Math.max(0, a - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => {
        setOpen(false);
        trigger.current?.focus();
      },
    };
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      move();
    }
  };

  return (
    <div className="ctrl-group" ref={root}>
      <span className="ctrl-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className={`select-trigger${filtered ? ' is-filtered' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onTriggerKey}
      >
        <span id={`${id}-value`}>{current?.label}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <ul
          ref={list}
          className="menu menu--scroll hrd-listbox"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              aria-checked={i === selectedIndex}
              className={`menu-item${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
