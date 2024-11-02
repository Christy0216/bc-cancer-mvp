import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type Donor = {
  first_name: string;
  last_name: string;
  city: string;
  total_donations?: number;
};

const CreateEventPage: React.FC = () => {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [donors, setDonors] = useState<Donor[]>([]);
  const [isEventCreated, setIsEventCreated] = useState(false);
  const [selectedDonors, setSelectedDonors] = useState<Set<number>>(new Set());
  const [eventId, setEventId] = useState<number | null>(null);

  const navigate = useNavigate(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/event", {
        name,
        location,
        date,
        description,
      });

      if (response.status === 200 && response.data.message) {
        alert("Event created successfully");
        setIsEventCreated(true);
        setEventId(response.data.message);

        const donorResponse = await axios.get(`/api/bccancer/search-donors`, {
          params: { cities: location, limit: 30 },
        });

        if (donorResponse.data && donorResponse.data.data) {
          const donorsArray = donorResponse.data.data;
          const formattedDonors = donorsArray.map((donor: any[]) => ({
            first_name: donor[5],
            last_name: donor[7],
            city: donor[20],
            total_donations: donor[9],
          }));

          setDonors(formattedDonors);

          // Pre-select all donors
          const allSelected: Set<number> = new Set(
            formattedDonors.map((_: Donor, index: number) => index)
          );
          setSelectedDonors(allSelected);
        } else {
          console.warn("Unexpected data format from API:", donorResponse.data);
          setDonors([]);
        }
      }
    } catch (error) {
      console.error("Error creating event or fetching donors:", error);
      alert("Failed to create event or fetch donors");
    }
  };

  const handleSelectDonor = (index: number) => {
    setSelectedDonors((prevSelected) => {
      const newSet = new Set(prevSelected);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleCreateTasks = async () => {
    if (!eventId) {
      alert("Event ID is missing. Please create the event first.");
      return;
    }

    const selectedDonorList = donors.filter((_, index) =>
      selectedDonors.has(index)
    );
    try {
      const response = await axios.post("/api/setup-tasks", {
        eventId,
        matchedDonors: {
          headers: ["first_name", "last_name", "city", "total_donations"],
          data: selectedDonorList.map((donor) => [
            "PMM Value", // PMM placeholder; replace with actual if available
            "", // SMM placeholder; replace if available
            "", // VMM placeholder; replace if available
            "no", // exclude placeholder
            "no", // deceased placeholder
            donor.first_name,
            "", // nickname placeholder
            donor.last_name,
            "", // organization placeholder
            donor.total_donations ?? 0,
            0, // total pledge placeholder
            0, // largest gift placeholder
            "", // appeal placeholder
            0, // first gift date placeholder
            0, // last gift date placeholder
            0, // last gift amount placeholder
            0, // last gift request placeholder
            "", // last gift appeal placeholder
            "", // address_line1 placeholder
            "", // address_line2 placeholder
            donor.city,
            "", // phone type placeholder
            "", // phone restrictions placeholder
            "", // email restrictions placeholder
            "", // communication restrictions placeholder
            "", // events in person placeholder
            "", // events magazine placeholder
            "", // communication preference placeholder
          ]),
        },
      });
      if (response.status === 200) {
        alert("Tasks created successfully for selected donors!");
        navigate("/events"); // Redirect to the Event Page
      }
    } catch (error) {
      console.error("Error creating tasks:", error);
      alert("Failed to create tasks");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700">Event Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            rows={3}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Create Event
        </button>
      </form>

      {isEventCreated && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Matched Donors</h2>
          {donors.length > 0 ? (
            <ul className="space-y-4">
              {donors.map((donor, index) => (
                <li
                  key={index}
                  className="border p-4 rounded flex items-center"
                >
                  <input
                    type="checkbox"
                    checked={selectedDonors.has(index)}
                    onChange={() => handleSelectDonor(index)}
                    className="mr-4"
                  />
                  <div>
                    <p>
                      <strong>Name:</strong> {donor.first_name} {donor.last_name}
                    </p>
                    <p>
                      <strong>City:</strong> {donor.city}
                    </p>
                    <p>
                      <strong>Total Donations:</strong> $
                      {donor.total_donations !== undefined
                        ? donor.total_donations.toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No donors found for the selected location.</p>
          )}
          <button
            onClick={handleCreateTasks}
            className="mt-4 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Create Tasks for Selected Donors
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateEventPage;
