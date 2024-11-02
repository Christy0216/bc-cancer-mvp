import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";

type Donor = {
  first_name: string;
  last_name: string;
  city: string;
  total_donations?: number;
};

type CityOption = {
  value: string;
  label: string;
};

const CreateEventPage: React.FC = () => {
  const [name, setName] = useState("");
  const [location, setLocation] = useState<CityOption | null>(null);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [donors, setDonors] = useState<Donor[]>([]);
  const [isEventCreated, setIsEventCreated] = useState(false);
  const [selectedDonors, setSelectedDonors] = useState<Set<number>>(new Set());
  const [eventId, setEventId] = useState<number | null>(null);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get("/api/bccancer/cities");
        const options = response.data.data.map(
          (city: { id: number; name: string }) => ({
            value: city.name,
            label: city.name,
          })
        );
        setCityOptions(options);
      } catch (error) {
        console.error("Error fetching city options:", error);
      }
    };
    fetchCities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/event", {
        name,
        location: location?.value,
        date,
        description,
      });

      if (response.status === 200 && response.data.message) {
        alert("Event created successfully");
        setIsEventCreated(true);
        setEventId(response.data.message);

        const donorResponse = await axios.get(`/api/bccancer/search-donors`, {
          params: { cities: location?.value, limit: 999 },
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
            "PMM Value",
            "",
            "",
            "no",
            "no",
            donor.first_name,
            "",
            donor.last_name,
            "",
            donor.total_donations ?? 0,
            0,
            0,
            "",
            0,
            0,
            0,
            0,
            "",
            "",
            "",
            donor.city,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ]),
        },
      });
      if (response.status === 200) {
        alert("Tasks created successfully for selected donors!");
        navigate("/events");
      }
    } catch (error) {
      console.error("Error creating tasks:", error);
      alert("Failed to create tasks");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Create New Event
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold">Location</label>
            <Select
              value={location}
              onChange={(selectedOption) => setLocation(selectedOption)}
              options={cityOptions}
              isSearchable
              placeholder="Select a city"
              className="w-full"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Create Event
          </button>
        </form>

        {isEventCreated && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Matched Donors</h2>
            {donors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 font-semibold text-left border-b">Select</th>
                      <th className="px-4 py-2 font-semibold text-left border-b">First Name</th>
                      <th className="px-4 py-2 font-semibold text-left border-b">Last Name</th>
                      <th className="px-4 py-2 font-semibold text-left border-b">City</th>
                      <th className="px-4 py-2 font-semibold text-left border-b">Total Donations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donors.map((donor, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-4 py-2 border text-center">
                          <input
                            type="checkbox"
                            checked={selectedDonors.has(index)}
                            onChange={() => handleSelectDonor(index)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-2 border">{donor.first_name}</td>
                        <td className="px-4 py-2 border">{donor.last_name}</td>
                        <td className="px-4 py-2 border">{donor.city}</td>
                        <td className="px-4 py-2 border">
                          {donor.total_donations !== undefined
                            ? `$${donor.total_donations.toLocaleString()}`
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No donors found for the selected location.</p>
            )}
            <button
              onClick={handleCreateTasks}
              className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition duration-300"
            >
              Create Tasks for Selected Donors
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEventPage;
