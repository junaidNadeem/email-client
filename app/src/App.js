import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Login from './Pages/Login';
import Account from './Pages/Accounts';
import Mails from './Pages/Mails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/accounts/" element={<Account />} />
        <Route path="/mails/" element={<Mails />} />
      </Routes>
    </Router>
  );
}

export default App;
