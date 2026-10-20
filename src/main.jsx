import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { AvisoProvider } from './components/Aviso'
import { aplicarTema } from './lib/tema'
import { registrarSW } from './lib/push'
import './styles.css'

aplicarTema()
registrarSW()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AvisoProvider>
          <App />
        </AvisoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
