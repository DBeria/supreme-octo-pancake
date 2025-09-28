import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
// UPDATE THIS LINE to point to the new store location
import store from './app/store'; 
import { Toaster } from 'react-hot-toast';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <App />
        <Toaster position="top-center" reverseOrder={false} />
      </Router>
    </Provider>
  </React.StrictMode>
);