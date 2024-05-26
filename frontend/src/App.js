import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Login from './Pages/Login';
import MainPage from './Pages/MainPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/MainPage/" element={<MainPage />} />
      </Routes>
    </Router>
  );
}

export default App;
