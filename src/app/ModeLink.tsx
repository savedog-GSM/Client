import { Link, useLocation, type LinkProps } from 'react-router-dom'

export default function ModeLink({ to, ...props }: LinkProps) {
  const { search } = useLocation()
  if (typeof to !== 'string' || !to.startsWith('/')) return <Link to={to} {...props} />
  const target = new URL(to, window.location.origin)
  const current = new URLSearchParams(search)
  for (const key of ['demo', 'present', 'step', 'scenario', 'run']) {
    const value = current.get(key)
    if (value !== null && !target.searchParams.has(key)) target.searchParams.set(key, value)
  }
  return <Link to={`${target.pathname}${target.search}${target.hash}`} {...props} />
}
