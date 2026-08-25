import React, { useEffect, useRef } from 'react'

export default function ShaderBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Fluid mesh control nodes with harmonic velocities
    let time = 0
    const nodes = [
      { bx: 0.15, by: 0.25, vx: 0.0012, vy: 0.0015, r: 420, color: 'rgba(255, 109, 41, 0.12)' },
      { bx: 0.85, by: 0.20, vx: 0.0015, vy: 0.0010, r: 460, color: 'rgba(255, 133, 82, 0.09)' },
      { bx: 0.50, by: 0.75, vx: 0.0010, vy: 0.0014, r: 440, color: 'rgba(201, 71, 15, 0.08)' },
      { bx: 0.80, by: 0.85, vx: 0.0013, vy: 0.0011, r: 380, color: 'rgba(255, 109, 41, 0.07)' },
      { bx: 0.20, by: 0.80, vx: 0.0009, vy: 0.0016, r: 360, color: 'rgba(255, 148, 102, 0.06)' },
    ]

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderOnce = () => {
      ctx.clearRect(0, 0, width, height)
      nodes.forEach((node, i) => {
        const x = node.bx * width
        const y = node.by * height
        const radius = node.r

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, node.color)
        gradient.addColorStop(0.6, node.color.replace(/[\d\.]+\)$/, '0.02)'))
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    if (prefersReducedMotion) {
      renderOnce()
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    const render = () => {
      time += 0.015
      ctx.clearRect(0, 0, width, height)

      nodes.forEach((node, i) => {
        const x = (node.bx + Math.sin(time * 0.8 + i * 1.5) * 0.12) * width
        const y = (node.by + Math.cos(time * 0.7 + i * 1.2) * 0.12) * height
        const radius = node.r + Math.sin(time + i) * 30

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, node.color)
        gradient.addColorStop(0.6, node.color.replace(/[\d\.]+\)$/, '0.02)'))
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="shader-bg" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90" />
      {/* Ambient flowing orbs */}
      <div
        className="shader-orb"
        style={{
          top: '-15%',
          right: '0%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(255, 109, 41, 0.16) 0%, rgba(255, 133, 82, 0.05) 55%, transparent 75%)',
        }}
      />
      <div
        className="shader-orb"
        style={{
          bottom: '-10%',
          left: '-10%',
          width: '650px',
          height: '650px',
          background: 'radial-gradient(circle, rgba(255, 109, 41, 0.12) 0%, rgba(201, 71, 15, 0.04) 55%, transparent 75%)',
          animationDelay: '-7s',
        }}
      />
    </div>
  )
}
