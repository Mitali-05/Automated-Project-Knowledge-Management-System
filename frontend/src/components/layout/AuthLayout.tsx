import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { PublicNavbar } from './PublicNavbar'

interface AuthLayoutProps {
  image: string
  imageAlt: string
  imageClass?: string
  heading: string
  text: string
  mirrored?: boolean
  children: ReactNode
}

export function AuthLayout({ image, imageAlt, imageClass = 'w-full', heading, text, mirrored, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-background selection:bg-primary-indigo selection:text-white">
      <div className={`pointer-events-none absolute top-[-20%] h-1/2 w-1/2 rounded-full bg-primary-indigo/20 blur-[120px] ${mirrored ? 'right-[-10%]' : 'left-[-10%]'}`} />
      <div className={`pointer-events-none absolute bottom-[-20%] h-1/2 w-1/2 rounded-full bg-primary-blue/20 blur-[120px] ${mirrored ? 'left-[-10%]' : 'right-[-10%]'}`} />
      <PublicNavbar />
      <main className="relative z-10 flex flex-1 flex-col justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-8 sm:gap-12 px-2 sm:px-4 lg:flex-row lg:gap-24">
          <div className="absolute left-1/2 top-1/2 hidden h-[80%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-surface-border to-transparent lg:block" />

          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative hidden flex-1 flex-col items-center justify-center lg:flex">
            <div className="flex w-full max-w-sm justify-center">
              <div className="relative flex w-full -rotate-1 justify-center rounded-xl border border-surface-border bg-surface-card p-2 shadow-2xl transition-transform duration-500 hover:rotate-0">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet opacity-20 blur-lg" />
                <img src={image} alt={imageAlt} className={`relative z-10 h-auto rounded-lg bg-white object-contain ${imageClass}`} />
              </div>
            </div>
            <div className="mt-10 max-w-sm text-center">
              <h3 className="mb-3 text-2xl font-bold text-text-primary">{heading}</h3>
              <p className="leading-relaxed text-text-secondary">{text}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="mx-auto w-full max-w-md flex-1">
            <div className="rounded-3xl border border-surface-border bg-surface-card/70 px-4 sm:px-8 py-6 sm:py-10 shadow-2xl backdrop-blur-xl">{children}</div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
