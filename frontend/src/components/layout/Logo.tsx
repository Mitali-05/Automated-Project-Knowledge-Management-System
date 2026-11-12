import { Link } from 'react-router-dom'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <img src="/prism-icon.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
      <span className="text-xl font-bold tracking-tight text-text-primary">PRISM</span>
    </Link>
  )
}
