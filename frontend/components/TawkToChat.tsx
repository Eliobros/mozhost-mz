'use client'

import { useEffect } from 'react'

export default function TawkToChat() {
  useEffect(() => {
    // Tawk.to script
    var Tawk_API = Tawk_API || {}
    var Tawk_LoadStart = new Date()
    
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
