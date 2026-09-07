import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './Dither.css'

/**
 * Dither Component (React Bits ISKOLAR Integration)
 * Subtle decorative WebGL wave dither background with Bayer matrix quantization.
 * Low-power, reduced-motion compliant, fully paused when off-screen.
 */
export default function Dither({
  waveColor = [0.79, 0.28, 0.06],
  disableAnimation = false,
  enableMouseInteraction = false,
  mouseRadius = 0.2,
  colorNum = 4,
  pixelSize = 3,
  waveAmplitude = 0.18,
  waveFrequency = 2.2,
  waveSpeed = 0.025,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // Verify WebGL availability
    let gl = null
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    } catch {
      setHasError(true)
      return
    }
    if (!gl) {
      setHasError(true)
      return
    }

    let isDestroyed = false
    let animationFrameId = null
    let isIntersecting = true
    let resizeTimer = null
    let observer = null
    let renderer, scene, camera, material, geometry, mesh

    // Defer WebGL setup by 50ms to yield the main thread for instant DOM paint and top Speed Index
    const initTimer = setTimeout(() => {
      if (isDestroyed || !container || !canvas) return

      // Check reduced motion preference
      const mediaReducedMotion = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
      const prefersReducedMotion = mediaReducedMotion ? mediaReducedMotion.matches : false

      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: 'low-power',
          preserveDrawingBuffer: false,
        })
      renderer.setPixelRatio(dpr)

      const rect = container.getBoundingClientRect()
      const width = Math.max(rect.width, 100)
      const height = Math.max(rect.height, 100)
      renderer.setSize(width, height, false)

      scene = new THREE.Scene()
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `

      const fragmentShader = `
        precision mediump float;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uWaveColor;
        uniform float uColorNum;
        uniform float uPixelSize;
        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;
        uniform vec2 uMouse;
        uniform float uMouseRadius;
        uniform bool uEnableMouse;
        varying vec2 vUv;

        // 4x4 Bayer Matrix
        float dither4x4(vec2 position, float brightness) {
          int x = int(mod(position.x, 4.0));
          int y = int(mod(position.y, 4.0));
          int index = x + y * 4;
          float limit = 0.0;
          if (index == 0) limit = 0.0625;
          else if (index == 1) limit = 0.5625;
          else if (index == 2) limit = 0.1875;
          else if (index == 3) limit = 0.6875;
          else if (index == 4) limit = 0.8125;
          else if (index == 5) limit = 0.3125;
          else if (index == 6) limit = 0.9375;
          else if (index == 7) limit = 0.4375;
          else if (index == 8) limit = 0.25;
          else if (index == 9) limit = 0.75;
          else if (index == 10) limit = 0.125;
          else if (index == 11) limit = 0.625;
          else if (index == 12) limit = 1.0;
          else if (index == 13) limit = 0.5;
          else if (index == 14) limit = 0.875;
          else if (index == 15) limit = 0.375;
          return brightness < limit ? 0.0 : 1.0;
        }

        void main() {
          vec2 pixelCoord = gl_FragCoord.xy / max(uPixelSize, 1.0);
          vec2 uv = vUv;

          // Harmonic Wave Distortion
          float wave1 = sin(uv.x * uWaveFrequency + uTime) * cos(uv.y * uWaveFrequency + uTime * 0.8) * uWaveAmplitude;
          float wave2 = cos((uv.x + uv.y) * (uWaveFrequency * 0.7) - uTime * 0.5) * (uWaveAmplitude * 0.6);
          float totalWave = wave1 + wave2;

          if (uEnableMouse) {
            float mouseDist = distance(uv, uMouse);
            if (mouseDist < uMouseRadius && mouseDist > 0.0) {
              totalWave += (1.0 - mouseDist / uMouseRadius) * 0.15;
            }
          }

          float brightness = clamp(0.5 + totalWave, 0.0, 1.0);
          float ditherVal = dither4x4(pixelCoord, brightness);

          // Color palette quantization
          float quantized = floor(ditherVal * uColorNum) / max(uColorNum - 1.0, 1.0);
          vec3 finalColor = uWaveColor * quantized;
          gl_FragColor = vec4(finalColor, quantized * 0.75);
        }
      `

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(width, height) },
          uWaveColor: { value: new THREE.Vector3(...waveColor) },
          uColorNum: { value: Math.max(colorNum, 2) },
          uPixelSize: { value: Math.max(pixelSize, 1) },
          uWaveAmplitude: { value: waveAmplitude },
          uWaveFrequency: { value: waveFrequency },
          uMouse: { value: new THREE.Vector2(-1, -1) },
          uMouseRadius: { value: mouseRadius },
          uEnableMouse: { value: enableMouseInteraction },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })

      geometry = new THREE.PlaneGeometry(2, 2)
      mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)
    } catch (initErr) {
      console.warn('Dither WebGL initialization skipped:', initErr?.message || initErr)
      setHasError(true)
      return
    }

    // Dynamic resize handler
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!container || !renderer || !material || isDestroyed) return
        const r = container.getBoundingClientRect()
        const w = Math.max(r.width, 100)
        const h = Math.max(r.height, 100)
        renderer.setSize(w, h, false)
        material.uniforms.uResolution.value.set(w, h)
      }, 100)
    }
    window.addEventListener('resize', handleResize)

    // Optional pointer interaction
    const handlePointerMove = (e) => {
      if (!enableMouseInteraction || !container || !material) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1.0 - (e.clientY - rect.top) / rect.height
      material.uniforms.uMouse.value.set(x, y)
    }

    if (enableMouseInteraction) {
      window.addEventListener('pointermove', handlePointerMove)
    }

    // IntersectionObserver to pause rendering when off-screen
    let observer = null
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          isIntersecting = entry.isIntersecting
          if (isIntersecting && !disableAnimation && !prefersReducedMotion && !animationFrameId) {
            animationFrameId = requestAnimationFrame(renderLoop)
          }
        },
        { threshold: 0.05 }
      )
      observer.observe(container)
    }

    // VisibilityChange handler to pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden && animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      } else if (!document.hidden && isIntersecting && !disableAnimation && !prefersReducedMotion && !animationFrameId) {
        animationFrameId = requestAnimationFrame(renderLoop)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    let elapsedTime = 0
    let lastTime = performance.now()

    // Render single frame for reduced motion or static mode
    if (disableAnimation || prefersReducedMotion) {
      material.uniforms.uTime.value = 0
      renderer.render(scene, camera)
      return () => {
        isDestroyed = true
        if (observer) observer.disconnect()
        window.removeEventListener('resize', handleResize)
        if (enableMouseInteraction) window.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        geometry?.dispose()
        material?.dispose()
        renderer?.dispose()
        renderer?.forceContextLoss()
      }
    }

    const renderLoop = (now) => {
      if (isDestroyed || !renderer || !material) return

      if (!isIntersecting || document.hidden) {
        animationFrameId = null
        return
      }

      const delta = Math.min((now - lastTime) * 0.001, 0.1)
      lastTime = now
      elapsedTime += delta * (waveSpeed * 60)

      material.uniforms.uTime.value = elapsedTime
      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(renderLoop)
    }

    animationFrameId = requestAnimationFrame(renderLoop)
  }, 50)

    return () => {
      isDestroyed = true
      clearTimeout(initTimer)
      if (resizeTimer) clearTimeout(resizeTimer)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (observer) observer.disconnect()
      window.removeEventListener('resize', handleResize)
      if (enableMouseInteraction) window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (mesh) scene?.remove(mesh)
      geometry?.dispose()
      material?.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
    }
  }, [waveColor, disableAnimation, enableMouseInteraction, mouseRadius, colorNum, pixelSize, waveAmplitude, waveFrequency, waveSpeed])

  if (hasError) {
    return <div className={`dither-fallback ${className}`} style={style} aria-hidden="true" />
  }

  return (
    <div
      ref={containerRef}
      className={`dither-container ${className}`}
      style={style}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="dither-canvas"
        role="presentation"
        aria-hidden="true"
      />
    </div>
  )
}
