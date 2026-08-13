import React from 'react'

export default function Footer(){
  return (
    <footer className="py-8 border-t border-slate-800/80">
      <div className="container mx-auto px-6 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <div className="text-xl font-semibold tracking-[0.18em] text-cyan-300">ISKOLAR</div>
          <div className="text-slate-500 text-sm">© 2026 Iskolar. All rights reserved.</div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#about" className="transition hover:text-white">Benefits</a>
          <a href="#download" className="transition hover:text-white">Mobile</a>
        </div>
      </div>
    </footer>
  )
}
