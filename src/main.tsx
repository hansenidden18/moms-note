import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { native } from './platform'
if(!native)registerSW({onOfflineReady(){window.dispatchEvent(new Event('hayati-offline-ready'))},onNeedRefresh(){window.dispatchEvent(new Event('hayati-update-ready'))}})
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
