import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import EventPage from './components/EventPage';
import CreateEventPage from './components/CreateEventPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/events" element={<EventPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
      </Routes>
    </Router>
  );
};

export default App;
