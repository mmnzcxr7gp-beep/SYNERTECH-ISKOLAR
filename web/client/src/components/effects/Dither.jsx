import React, { useEffect, useRef } from 'react'
import './Dither.css'

/**
 * Lightweight Dither Component (Pure 2D Canvas & CSS Mesh)
 * Replaces heavy Three.js WebGL shaders with an ultra-lightweight, high-performance
 * ambient gradient and subtle wave canvas with 0 external dependencies.
 */
export default function Dither({
  waveColor = [0.19, 0.36, 0.99],
  disableAnimation = false,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = null
    let step = 0

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = Math.max(rect.width, 320)
        canvas.height = Math.max(rect.height, 200)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      if (!ctx || !canvas.width || !canvas.height) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      
      // Radial ambient glow
      const baseGrad = ctx.createRadialGradient(
        canvas.width * 0.75,
        canvas.height * 0.35,
        10,
        canvas.width * 0.75,
        canvas.height * 0.35,
        canvas.width * 0.65
      )

      if (isDark) {
        baseGrad.addColorStop(0, 'rgba(48, 91, 254, 0.12)')
        baseGrad.addColorStop(0.5, 'rgba(21, 38, 92, 0.06)')
        baseGrad.addColorStop(1, 'rgba(11, 19, 43, 0)')
      } else {
        baseGrad.addColorStop(0, 'rgba(48, 91, 254, 0.08)')
        baseGrad.addColorStop(0.5, 'rgba(79, 150, 255, 0.04)')
        baseGrad.addColorStop(1, 'rgba(247, 249, 253, 0)')
      }

      ctx.fillStyle = baseGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Subtle ambient wave curve
      if (!disableAnimation) {
        step += 0.015
        ctx.save()
        ctx.beginPath()
        const yOffset = canvas.height * 0.45
        ctx.moveTo(0, yOffset)
        for (let x = 0; x <= canvas.width; x += 25) {
          const y = yOffset + Math.sin(x * 0.006 + step) * 20 + Math.cos(x * 0.009 + step * 0.8) * 12
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()

        const waveGrad = ctx.createLinearGradient(0, yOffset - 30, 0, canvas.height)
        if (isDark) {
          waveGrad.addColorStop(0, 'rgba(79, 150, 255, 0.03)')
          waveGrad.addColorStop(1, 'rgba(48, 91, 254, 0.005)')
        } else {
          waveGrad.addColorStop(0, 'rgba(48, 91, 254, 0.03)')
          waveGrad.addColorStop(1, 'rgba(232, 237, 247, 0.005)')
        }
        ctx.fillStyle = waveGrad
        ctx.fill()
        ctx.restore()

        animationFrameId = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [disableAnimation])

  return (
    <div ref={containerRef} className={`dither-container ${className}`} style={style}>
      <canvas ref={canvasRef} className="dither-canvas" />
    </div>
  )
}
