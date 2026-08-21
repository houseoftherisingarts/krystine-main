import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadDictionary } from './src/lib/i18n/lang';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
loadDictionary().finally(() => root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
));