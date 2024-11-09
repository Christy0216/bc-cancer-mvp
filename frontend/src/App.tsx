import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import EventPage from './components/EventPage';
import CreateEventPage from './components/CreateEventPage';
import EventDetailPage from './components/EventDetailPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/events" element={<EventPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="/event/:eventId" element={<EventDetailPage />} />
      </Routes>
    </Router>
  );
};

export default App;