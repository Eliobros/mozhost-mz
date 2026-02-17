'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

export default function CustomSplash() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Esconder splash nativo se for app mobile
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide()
    }
    
    // Simular carregamento progressivo
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => setIsLoading(false), 500)
          return 100
        }
        return prev + 10
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-black to-gray-900">
      {/* Logo MozHost */}
      <img 
        src="/mozhost.png"
        alt="MozHost" 
        className="w-40 h-40 mb-8 animate-pulse"
        style={{ 
          filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.5))'
        }}
      />
      
      {/* Nome */}
      <h1 className="text-white text-4xl font-bold mb-2 tracking-wider">
        MozHost
      </h1>
      
      {/* Subtítulo */}
      <p className="text-blue-400 text-sm mb-8 font-medium">
        Hospedagem de Bots & APIs 🇲🇿
      </p>
      
      {/* Barra de progresso */}
      <div className="w-72 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4 shadow-lg">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 transition-all duration-300 ease-out rounded-full"
          style={{ 
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
          }}
        />
      </div>
      
      {/* Texto de loading com pontinhos animados */}
      <div className="flex items-center gap-1 text-gray-400 text-sm">
        <span>Carregando</span>
        <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
      </div>
      
      {/* Porcentagem */}
      <p className="text-blue-500 text-xs mt-3 font-mono font-bold">{progress}%</p>
      
      {/* Footer */}
      <p className="absolute bottom-8 text-gray-600 text-xs">
        Powered by Eliobros Tech
      </p>
    </div>
  )
}
