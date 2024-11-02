import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

type EventDetailProps = {
  event_id: number;
  name: string;
  description: string; // Add any other relevant fields
  date?: string; // Example additional field
};

const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetailProps | null>(null);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        const response = await axios.get(`/api/events/${eventId}`);
        setEvent(response.data);
      } catch (error) {
        console.error("Error fetching event details:", error);
      }
    };

    fetchEventDetail();
  }, [eventId]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
        <p className="text-2xl text-white">Loading event details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">
          {event.name}
        </h1>
        <p className="text-lg text-gray-700 mb-4">{event.description}</p>
        {event.date && (
          <p className="text-md text-gray-600 mb-2">Date: {event.date}</p>
        )}
        {/* Add more event details and styling as needed */}
      </div>
    </div>
  );
};

export default EventDetail;
