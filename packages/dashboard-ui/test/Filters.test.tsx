import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardResponse } from '@hrd/core';
import { Filters } from '../src/components/Filters';

const filters: DashboardResponse['filters'] = {
  applied: { month: '2026-10', department: 'All', role: 'All' },
  options: {
    months: ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05'],
    departments: ['All', 'Analysis', 'Not set', 'Operations', 'Pricing', 'Sales'],
    roles: ['All', 'Energy Analyst', 'Sales Team Manager', 'Senior Energy Analyst', 'Senior Pricing Specialist'],
  },
};

const setup = (applied = filters.applied, historyStart: string | null = '2025-10') => {
  const onChange = vi.fn();
  render(<Filters filters={{ ...filters, applied }} currentMonth="2026-10" departmentHistoryStartMonth={historyStart} onChange={onChange} />);
  return onChange;
};

describe('Filters', () => {
  it('labels each dropdown with its name and current value', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Department All departments' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Role All roles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month October 2026 (this month)' })).toBeInTheDocument();
  });

  it('opens with the keyboard, moves with the arrows and picks with Enter', () => {
    const onChange = setup();
    const trigger = screen.getByRole('button', { name: /^Role/ });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const list = screen.getByRole('listbox', { name: 'Role' });
    expect(within(list).getAllByRole('option')).toHaveLength(5);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(list).toHaveAttribute('aria-activedescendant', 'hrd-f-role-opt-3');
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ month: '2026-10', department: 'All', role: 'Senior Energy Analyst' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    setup();
    const trigger = screen.getByRole('button', { name: /^Month/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('picks with a click, and marks a filtered dropdown', () => {
    const onChange = setup({ month: '2026-10', department: 'Pricing', role: 'All' });
    expect(screen.getByRole('button', { name: /^Department/ })).toHaveClass('is-filtered');
    fireEvent.click(screen.getByRole('button', { name: /^Month/ }));
    fireEvent.click(screen.getByRole('option', { name: 'May 2026' }));
    expect(onChange).toHaveBeenCalledWith({ month: '2026-05', department: 'Pricing', role: 'All' });
  });

  it('offers to clear the filters, and explains an earlier month', () => {
    const onChange = setup({ month: '2026-05', department: 'All', role: 'All' });
    expect(screen.getByText(/Charts show Feb 2026 to Aug 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onChange).toHaveBeenCalledWith({ month: '2026-10', department: 'All', role: 'All' });
  });

  it('says when departments and roles before history began use the earliest values', () => {
    setup({ month: '2026-05', department: 'Sales', role: 'All' }, '2026-04');
    expect(screen.getByText('Departments and roles before April 2026 use the earliest values known.')).toBeInTheDocument();
  });
});
