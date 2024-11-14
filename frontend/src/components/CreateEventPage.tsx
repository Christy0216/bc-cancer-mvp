import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import {
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
} from "react-icons/fa";

type Donor = {
  first_name: string;
  nick_name: string;
  last_name: string;
  pmm: string;
  organization_name: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [donorsPerPage] = useState(10);
  const [jumpToPage, setJumpToPage] = useState(currentPage.toString());

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
        fetchDonors();
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event");
    }
  };

  const fetchDonors = async () => {
    try {
      const response = await axios.get(`/api/bccancer/search-donors`, {
        params: { cities: location?.value, limit: 999 },
      });

      if (response.data && response.data.data) {
        const donorsArray = response.data.data;
        const formattedDonors = donorsArray.map((donor: Donor[]) => ({
          first_name: donor[5],
          nick_name: donor[6],
          last_name: donor[7],
          pmm: donor[0],
          organization_name: donor[8],
          city: donor[20],
          total_donations: donor[9],
        }));
        // Step 1: Save donors to the backend using POST /api/donor endpoint
        const saveDonorsResponse = await axios.post('/api/donors', formattedDonors);

        if (saveDonorsResponse.status === 200) {
            // Step 2: Set donors state if saving was successful
            setDonors(formattedDonors);
        } else {
            console.warn("Failed to save donors to the database:", saveDonorsResponse.data);
        }
      } else {
        console.warn("Unexpected data format from API:", response.data);
        setDonors([]);
      }
    } catch (error) {
      console.error("Error fetching donors:", error);
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
  
    const selectedDonorList = donors.filter((_, index) => selectedDonors.has(index));
  
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
  
  const totalPages = Math.ceil(donors.length / donorsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleJumpToPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (page >= 1 && page <= totalPages) {
      setJumpToPage(e.target.value);
    } else if (!e.target.value) {
      setJumpToPage("");
    }
  };

  const jumpToPageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
    }
  };

  const handleFirstPage = () => handlePageChange(1);
  const handleLastPage = () => handlePageChange(totalPages);
  const handleNextPage = () => handlePageChange(currentPage + 1);
  const handlePreviousPage = () => handlePageChange(currentPage - 1);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...');
        pages.push(totalPages);
      } else if (currentPage > totalPages - 4) {
        pages.push(1, '...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Create New Event
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold">
              Event Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold">
              Location
            </label>
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
            <label className="block text-gray-700 font-semibold">
              Description
            </label>
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
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Matched Donors
            </h2>
            {donors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 font-semibold text-left border-b">
                        Select
                      </th>
                      <th className="px-4 py-2 font-semibold text-left border-b">
                        First Name
                      </th>
                      <th className="px-4 py-2 font-semibold text-left border-b">
                        Last Name
                      </th>
                      <th className="px-4 py-2 font-semibold text-left border-b">PMM</th>
                      <th className="px-4 py-2 font-semibold text-left border-b">
                        City
                      </th>
                      <th className="px-4 py-2 font-semibold text-left border-b">
                        Total Donations
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {donors
                      .slice(
                        (currentPage - 1) * donorsPerPage,
                        currentPage * donorsPerPage
                      )
                      .map((donor, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-gray-50" : "bg-white"
                          }
                        >
                          <td className="px-4 py-2 border text-center">
                            <input
                              type="checkbox"
                              checked={selectedDonors.has(
                                (currentPage - 1) * donorsPerPage + index
                              )}
                              onChange={() =>
                                handleSelectDonor(
                                  (currentPage - 1) * donorsPerPage + index
                                )
                              }
                              className="form-checkbox h-5 w-5 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-2 border">
                            {donor.first_name}
                          </td>
                          <td className="px-4 py-2 border">
                            {donor.last_name}
                          </td>
                          <td className="px-4 py-2 border">{donor.pmm}</td>
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
                <div className="flex justify-center items-center mt-4 space-x-2">
                  <button
                    onClick={handleFirstPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <FaAngleDoubleLeft />
                  </button>
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <FaAngleLeft />
                  </button>
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        typeof page === "number" && handlePageChange(page)
                      }
                      className={`${
                        currentPage === page
                          ? "bg-blue-500 text-white"
                          : "border border-gray-300"
                      } px-3 py-1 rounded-full mx-1 hover:bg-gray-100`}
                      disabled={page === "..."}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <FaAngleRight />
                  </button>
                  <button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <FaAngleDoubleRight />
                  </button>
                  <form
                    onSubmit={jumpToPageSubmit}
                    className="flex items-center ml-4"
                  >
                    <input
                      type="number"
                      value={jumpToPage}
                      onChange={handleJumpToPageChange}
                      className="w-14 px-2 py-1 text-center border rounded-lg"
                      min="1"
                      max={totalPages.toString()}
                    />
                    <button type="submit" className="ml-2 text-blue-600">
                      Go
                    </button>
                  </form>
                </div>
                <div className="text-center mt-2 text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">
                No donors found for the selected location.
              </p>
            )}
            <button
              disabled={selectedDonors.size === 0}
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
