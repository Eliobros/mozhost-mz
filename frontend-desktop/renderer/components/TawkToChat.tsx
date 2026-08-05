'use client'

import { useEffect } from 'react'

export default function TawkToChat() {
  useEffect(() => {
    // Tawk.to script
    const w = window as any;
    w.Tawk_API = w.Tawk_API || {}
    w.Tawk_LoadStart = new Date()
    
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://embed.tawk.to/6948ca0cf2afee197cc999d8/1jd25agso'
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')
    
    const firstScript = document.getElementsByTagName('script')[0]
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript)
    }
  }, [])

  return null
}
