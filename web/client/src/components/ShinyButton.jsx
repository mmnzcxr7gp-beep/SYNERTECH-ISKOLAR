import React from 'react'
import { motion } from 'framer-motion'

export default function ShinyButton({
  children,
  onClick,
  className = '',
  variant = 'primary', // 'primary' | 'secondary'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  as,
  href,
  download,
  target,
  rel,
  ...props
}) {
  const Component = href || as === 'a' ? motion.a : motion.button
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-xs sm:text-sm',
    lg: 'px-7 py-3.5 text-sm sm:text-base',
  }[size]

  const linkProps = href ? { href, download, target, rel } : {}

  if (variant === 'secondary') {
    return (
      <Component
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`btn-secondary inline-flex items-center justify-center gap-2 font-bold cursor-pointer ${sizeClasses} ${className}`}
        {...linkProps}
        {...props}
      >
        {icon && <span>{icon}</span>}
        <span>{children}</span>
      </Component>
    )
  }

  return (
    <Component
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`btn-primary inline-flex items-center justify-center gap-2 font-extrabold tracking-wide cursor-pointer ${sizeClasses} ${className}`}
      {...linkProps}
      {...props}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </Component>
  )
}

