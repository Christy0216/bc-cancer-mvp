import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

type Event = {
  event_id: number;
  name: string;
  pending: number;
  complete: number;
  invited: number;
};

const EventPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get<Event[]>('/api/events'); // Specify the response type
        setEvents(response.data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  const handleCreateEvent = () => {
    navigate('/create-event'); // Navigate to the CreateEventPage
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Events</h1>
      <button 
        onClick={handleCreateEvent} 
        className="bg-blue-500 text-white py-2 px-4 rounded mb-4"
      >
        New
      </button>
      <div>
        {events.map((event) => (
          <div key={event.event_id} className="border-b py-4 flex items-center">
            <div className="flex-grow">
              <p className="text-lg font-semibold">{event.name}</p>
              <p className="text-gray-600">Pending | Complete | Invited</p>
            </div>
            <div className="flex space-x-4">
              <div className="text-center">
                <p>{event.pending}%</p>
                <p>Pending</p>
              </div>
              <div className="text-center">
                <p>{event.complete}%</p>
                <p>Complete</p>
              </div>
              <div className="text-center">
                <p>{event.invited}%</p>
                <p>Invited</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventPage;
