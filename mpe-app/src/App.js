import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import MpePage from './pages/mpe'; 

function HomePage() {
  return (
    <div>
      <Link
        className="App-link"
        to="/mpe"
      >
        Go to MPE Analysis Page
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <header className="App-header">
              <HomePage />
            </header>
          } />
          <Route path="/mpe" element={<MpePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;