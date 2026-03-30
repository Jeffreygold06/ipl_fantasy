import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'blue' | 'default';

interface Props {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export const StatusBadge: React.FC<Props> = ({ variant, children }) => {
  let pillClass = 'pill ';
  if (variant === 'success') pillClass += 'pill-success';
  else if (variant === 'blue') pillClass += 'pill-blue';
  else if (variant === 'warning') pillClass += 'pill-warning';
  else if (variant === 'error') pillClass += 'pill-error';
  else pillClass += 'pill-default'; // transparent fallback

  return (
    <span className={pillClass}>
      {children}
    </span>
  );
};
