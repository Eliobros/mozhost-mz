// app/components/CanonicalUrl.tsx
'use client'
import { usePathname } from 'next/navigation'

export default function CanonicalUrl() {
  const pathname = usePathname()
  const canonical = `https://mozhost.shop${pathname}`
  
  return (
    <link rel="canonical" href={canonical} />
  )
}
