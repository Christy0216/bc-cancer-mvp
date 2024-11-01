"import React from 'react';"
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Donors from './pages/Donor';
import AddDonor from './pages/AddDonor';

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <h1>BC Cancer Donor System</h1>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/add-donor" element={<AddDonor />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;