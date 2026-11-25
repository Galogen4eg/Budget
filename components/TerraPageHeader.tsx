import React from 'react';
import { ICON_ACTION, TOOLBAR_ACTION, TOOLBAR_ACTION_IDLE, TOOLBAR_ACTION_PRIMARY, PAGE_HEADING } from './filterUiTokens';

type HeaderActionProps = {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  variant?: 'secondary' | 'primary' | 'danger';
  showLabel?: boolean;
  disabled?: boolean;
  pressed?: boolean;
};

export function TerraHeaderAction({ label, onClick, icon, variant = 'secondary', showLabel = false, disabled, pressed }: HeaderActionProps) {
  const tone = variant === 'primary' ? TOOLBAR_ACTION_PRIMARY : variant === 'danger'
    ? 'bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)]'
    : TOOLBAR_ACTION_IDLE;
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    aria-pressed={pressed} className={`${showLabel ? TOOLBAR_ACTION : ICON_ACTION} ${tone} terra-press cursor-pointer`}>
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center">{icon}</span>
    {showLabel && <span>{label}</span>}
  </button>;
}

interface TerraPageHeaderProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  globalActions?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  headingLevel?: 1 | 2;
}

/** Presentation only: shared by real screens and the isolated UI catalog. */
export function TerraPageHeader({ title, subtitle, leading, globalActions, actions, children, headingLevel = 1 }: TerraPageHeaderProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  return <header data-terra-mobile-header data-terra-page-header className="terra-page-header">
    <div className="terra-page-header-main">
      {leading}
      <div className="terra-page-header-title">
        <Heading className={PAGE_HEADING}>{title}</Heading>
        {subtitle && <p className="terra-page-header-subtitle">{subtitle}</p>}
      </div>
      {globalActions && <div className="terra-page-header-global">{globalActions}</div>}
    </div>
    {actions && <div className="terra-page-header-actions">{actions}</div>}
    {children}
  </header>;
}
