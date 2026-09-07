import React, { useEffect, useRef, useState, useId } from 'react'
import './ParticleText.css'

/**
 * ParticleText Component (React Bits ISKOLAR Integration)
 * Renders text as dynamic interactive particles that assemble on trigger.
 * Fully accessible with decorative canvas flags and reduced-motion compliance.
 */
export default function ParticleText({
  text = 'Scholarship Applications Made Clearer',
  particleSize = 1.8,
  density = 5,
  color = '#201714',
  highlightColor = '#c9470f',
  scatter = 100,
  gatherDuration = 1100,
  stagger = 220,
  pointerRepel = 20,
  repelRadius = 80,
  idleDrift = 0.25,
  trigger = 'mount',
  fontSize = 'clamp(2.5rem, 7vw, 5.5rem)',
  fontWeight = 800,
  fontFamily = 'VT323, "Anonymous Pro", monospace, sans-serif',
  glow = false,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [hasError, setHasError] = useState(false)
  const id = useId()

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setHasError(true)
      return
    }

    let animationFrameId
    let isDestroyed = false

    // Check reduced motion preference
    const mediaReducedMotion = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
    const prefersReducedMotion = mediaReducedMotion ? mediaReducedMotion.matches : false

    // Check coarse pointer (touch-only devices)
    const isTouchOnly = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : false

    // Mobile / small viewport density adjustment for performance
    const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 640 : false
    const effectiveDensity = isSmallScreen ? Math.max(density, 6) : density
    const effectiveRepel = isTouchOnly ? 0 : pointerRepel

    let particles = []
    let mouse = { x: -9999, y: -9999, active: false }
    let animationStartTime = 0

    // Parse computed font size in pixels without forced DOM reflow
    const getComputedPixelFontSize = () => {
      if (typeof fontSize === 'number') return fontSize
      const width = typeof window !== 'undefined' ? window.innerWidth || 1024 : 1024
      const str = String(fontSize)
      const clampMatch = str.match(/clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/)
      if (clampMatch) {
        const minPx = parseFloat(clampMatch[1]) * 16
        const vwPx = (parseFloat(clampMatch[2]) / 100) * width
        const maxPx = parseFloat(clampMatch[3]) * 16
        return Math.min(Math.max(minPx, vwPx), maxPx)
      }
      const remMatch = str.match(/([\d.]+)rem/)
      if (remMatch) return parseFloat(remMatch[1]) * 16
      const pxMatch = str.match(/([\d.]+)px/)
      if (pxMatch) return parseFloat(pxMatch[1])
      return 16
    }

    const initParticles = () => {
      if (isDestroyed || !container || !canvas) return

      const rect = container.getBoundingClientRect()
      const availableWidth = Math.max(container.clientWidth || rect.width || 260, 220)
      const width = Math.min(availableWidth, window.innerWidth ? window.innerWidth - 32 : availableWidth)
      const pixelFontSize = getComputedPixelFontSize()
      const lineHeight = pixelFontSize * 1.15

      // Measure words and split into wrapped lines
      const words = text.split(' ')
      const offscreen = document.createElement('canvas')
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) return

      const fontSpec = `${fontWeight} ${pixelFontSize}px ${fontFamily}`
      offCtx.font = fontSpec

      const lines = []
      let currentLine = ''

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i]
        const metrics = offCtx.measureText(testLine)
        if (metrics.width > width && currentLine) {
          lines.push(currentLine)
          currentLine = words[i]
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)

      const totalHeight = Math.max(lines.length * lineHeight + pixelFontSize * 0.4, 70)

      // Set canvas display and buffer resolution with DPR cap at 2
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(totalHeight * dpr)
      canvas.style.width = '100%'
      canvas.style.maxWidth = `${width}px`
      canvas.style.height = `${totalHeight}px`

      offscreen.width = canvas.width
      offscreen.height = canvas.height
      offCtx.scale(dpr, dpr)
      offCtx.font = fontSpec
      offCtx.textBaseline = 'top'

      // Render lines to offscreen canvas
      lines.forEach((lineText, lineIdx) => {
        const y = lineIdx * lineHeight
        let x = 0

        // Highlight specific emphasis words like "Clearer"
        const lineWords = lineText.split(' ')
        lineWords.forEach((w, wIdx) => {
          const isHighlight = /clearer|scholarship/i.test(w)
          offCtx.fillStyle = isHighlight ? highlightColor : color
          offCtx.fillText(w, x, y)
          x += offCtx.measureText(w + ' ').width
        })
      })

      // Sample pixels from offscreen canvas
      const imgData = offCtx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data
      const step = Math.max(Math.round(effectiveDensity * dpr), 2)
      const newParticles = []

      for (let py = 0; py < canvas.height; py += step) {
        for (let px = 0; px < canvas.width; px += step) {
          const idx = (py * canvas.width + px) * 4
          const alpha = data[idx + 3]

          if (alpha > 120) {
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const particleColor = `rgba(${r}, ${g}, ${b}, ${alpha / 255})`

            const targetX = px / dpr
            const targetY = py / dpr

            // Initial scatter offset
            const angle = Math.random() * Math.PI * 2
            const dist = (Math.random() * 0.8 + 0.2) * scatter
            const startX = targetX + Math.cos(angle) * dist
            const startY = targetY + Math.sin(angle) * dist

            newParticles.push({
              targetX,
              targetY,
              startX,
              startY,
              currentX: prefersReducedMotion ? targetX : startX,
              currentY: prefersReducedMotion ? targetY : startY,
              color: particleColor,
              size: particleSize,
              delay: Math.random() * stagger,
              phase: Math.random() * Math.PI * 2,
              vx: 0,
              vy: 0,
            })
          }
        }
      }

      particles = newParticles
      animationStartTime = performance.now()
    }

    const initTimer = setTimeout(initParticles, 40)

    // Handle Resize
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        initParticles()
      }, 150)
    }
    window.addEventListener('resize', handleResize)

    // Pointer Interaction Listeners
    const handlePointerMove = (e) => {
      if (effectiveRepel <= 0) return
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }

    const handlePointerLeave = () => {
      mouse.active = false
    }

    if (effectiveRepel > 0) {
      canvas.addEventListener('mousemove', handlePointerMove)
      canvas.addEventListener('mouseleave', handlePointerLeave)
    }

    // Animation Loop
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

    const render = (now) => {
      if (isDestroyed) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      if (glow) {
        ctx.shadowBlur = 8
        ctx.shadowColor = highlightColor
      }

      const elapsed = now - animationStartTime
      const timeSec = now * 0.001

      let allSettled = true

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        if (prefersReducedMotion) {
          p.currentX = p.targetX
          p.currentY = p.targetY
        } else {
          const particleElapsed = Math.max(0, elapsed - p.delay)
          const progress = Math.min(1, particleElapsed / gatherDuration)
          const ease = easeOutCubic(progress)

          // Interpolate to target
          let targetX = p.startX + (p.targetX - p.startX) * ease
          let targetY = p.startY + (p.targetY - p.startY) * ease

          // Subtle harmonic idle drift once gathered
          if (progress >= 1 && idleDrift > 0) {
            targetX += Math.sin(timeSec * 1.5 + p.phase) * idleDrift
            targetY += Math.cos(timeSec * 1.2 + p.phase) * idleDrift
          }

          // Pointer repulsion
          if (mouse.active && effectiveRepel > 0) {
            const dx = p.currentX - mouse.x
            const dy = p.currentY - mouse.y
            const dist = Math.hypot(dx, dy)

            if (dist < repelRadius && dist > 0) {
              const force = (1 - dist / repelRadius) * effectiveRepel
              const nx = dx / dist
              const ny = dy / dist
              targetX += nx * force
              targetY += ny * force
            }
          }

          // Smooth spring to calculated target
          p.currentX += (targetX - p.currentX) * 0.2
          p.currentY += (targetY - p.currentY) * 0.2

          if (progress < 1) allSettled = false
        }

        // Draw particle
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.currentX, p.currentY, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      // If reduced motion or everything settled with no drift and no mouse, we can throttle/render on demand
      if (prefersReducedMotion && allSettled) {
        return // Static single render
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      isDestroyed = true
      clearTimeout(initTimer)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
      if (effectiveRepel > 0) {
        canvas.removeEventListener('mousemove', handlePointerMove)
        canvas.removeEventListener('mouseleave', handlePointerLeave)
      }
      cancelAnimationFrame(animationFrameId)
    }
  }, [text, particleSize, density, color, highlightColor, scatter, gatherDuration, stagger, pointerRepel, repelRadius, idleDrift, trigger, fontSize, fontWeight, fontFamily, glow])

  if (hasError) {
    return (
      <div className={`particle-text-fallback ${className}`} style={style}>
        {text}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      id={`particle-text-${id}`}
      className={`particle-text-container ${className}`}
      style={style}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="particle-text-canvas"
        role="presentation"
        aria-hidden="true"
      />
    </div>
  )
}
