import React, { Component } from 'react'

/**
 * EffectErrorBoundary Component
 * Isolates WebGL and Canvas visual rendering errors to prevent homepage crashes.
 */
export default class EffectErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.warn('EffectErrorBoundary caught an issue:', error?.message || error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}
