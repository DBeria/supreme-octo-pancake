import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store'; // This will import the store we create next
import { Toaster } from 'react-hot-toast';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* This Provider makes the Redux store available to all your pages. */}
    <Provider store={store}>
      {/* This Router makes all the <Routes> in your App.jsx work. */}
      <Router>
        <App />
        <Toaster position="top-center" reverseOrder={false} />
      </Router>
    </Provider>
  </React.StrictMode>
);