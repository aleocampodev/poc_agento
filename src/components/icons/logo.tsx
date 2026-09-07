import clsx from 'clsx'
import React from 'react'

export interface LogoIconProps extends React.ComponentProps<'img'> {
  variant?: 'blanco' | 'negro' | 'color' | 'blanco-horizontal'
}

const VARIANT_SRC: Record<NonNullable<LogoIconProps['variant']>, string> = {
  blanco: '/nenufar-blanco.svg',
  negro: '/nenufar-negro.svg',
  color: '/nenufar-logo.svg',
  'blanco-horizontal': '/nenufar-logo-blanco.svg',
}

export function LogoIcon({ variant = 'blanco', className, src, ...props }: LogoIconProps) {
  const logoSrc = src || VARIANT_SRC[variant]

  return (
    /* eslint-disable @next/next/no-img-element */
    <img
      alt="Nenúfar Logo"
      src={logoSrc}
      {...props}
      className={clsx('h-8 w-8 object-contain', className)}
    />
  )
}

