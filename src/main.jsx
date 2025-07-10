import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import StripeProvider from './components/StripeProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <StripeProvider>
    <App />
  </StripeProvider>
)
