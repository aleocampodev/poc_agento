import React from 'react'

export const Logo = () => {
  return (
    /* eslint-disable @next/next/no-img-element */
    <div className="flex items-center py-1">
      <img
        alt="Nenúfar Logo"
        className="h-8 w-auto object-contain max-h-8"
        src="/nenufar-logo.svg"
      />
    </div>
  )
}

