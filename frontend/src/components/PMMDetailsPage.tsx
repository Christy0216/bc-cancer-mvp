import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
} from "react-icons/fa";

type Task = {
  task_id: number;
  event_id: number;
  donor_id: number;
  status: "pending" | "approved" | "rejected";
};

type PMMSummary = {
  pmm: string;
  pendingCount: number;
  completedCount: number;
};

const PMMDetailsPage: React.FC = () => {
  const { pmmName } = useParams<{ pmmName: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pmmSummary, setPmmSummary] = useState<PMMSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  const [jumpToPage, setJumpToPage] = useState(currentPage.toString());

  useEffect(() => {
    const fetchPMMDetailsAndTasks = async () => {
      try {
        // Fetch PMM summary to confirm if pmmName is valid
        const pmmResponse = await axios.get(`/api/pmm`);
        const pmmList = pmmResponse.data;
        const isValidPMM = pmmList.some((pmm: any) => pmm.name === pmmName);

        if (!isValidPMM) {
          setLoading(false);
          return;
        }

        // Fetch tasks for the specific PMM using the backend API
        const response = await axios.get<Task[]>(`/api/tasks-of-pmm/${pmmName}`);
        const fetchedTasks = response.data;

        setTasks(fetchedTasks);

        // Calculate pending and completed tasks
        const pendingCount = fetchedTasks.filter(task => task.status === "pending").length;
        const completedCount = fetchedTasks.filter(
          task => task.status === "approved" || task.status === "rejected"
        ).length;

        // Set PMM summary if pmmName is defined
        if (pmmName) {
          setPmmSummary({
            pmm: pmmName,
            pendingCount,
            completedCount,
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching tasks for PMM:", error);
        setLoading(false);
      }
    };

    fetchPMMDetailsAndTasks();
  }, [pmmName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
        <p className="text-2xl text-white">Loading PMM details...</p>
      </div>
    );
  }

  if (!pmmSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
        <p className="text-2xl text-white">PMM not found.</p>
      </div>
    );
  }

  // Split tasks into pending and completed for rendering
  const pendingTasks = tasks.filter(task => task.status === "pending");
  const completedTasks = tasks.filter(
    task => task.status === "approved" || task.status === "rejected"
  );

  // Pagination logic
  const totalPages = Math.ceil(tasks.length / tasksPerPage);

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

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">PMM: {pmmSummary.pmm}</h1>
        <p className="text-lg mb-4">Pending Tasks: {pmmSummary.pendingCount}</p>
        <p className="text-lg mb-6">Completed Tasks: {pmmSummary.completedCount}</p>

        {/* Table for Pending Tasks */}
        <h2 className="text-2xl font-bold mb-4">Pending Tasks</h2>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task ID</th>
              <th className="border px-4 py-2 text-left">Event ID</th>
              <th className="border px-4 py-2 text-left">Donor ID</th>
              <th className="border px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {pendingTasks
              .slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage)
              .map((task, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{task.task_id}</td>
                  <td className="border px-4 py-2">{task.event_id}</td>
                  <td className="border px-4 py-2">{task.donor_id}</td>
                  <td className="border px-4 py-2">{task.status}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Table for Completed Tasks */}
        <h2 className="text-2xl font-bold mb-4">Completed Tasks</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task ID</th>
              <th className="border px-4 py-2 text-left">Event ID</th>
              <th className="border px-4 py-2 text-left">Donor ID</th>
              <th className="border px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {completedTasks
              .slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage)
              .map((task, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{task.task_id}</td>
                  <td className="border px-4 py-2">{task.event_id}</td>
                  <td className="border px-4 py-2">{task.donor_id}</td>
                  <td className="border px-4 py-2">{task.status}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
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
          <form onSubmit={jumpToPageSubmit} className="flex items-center ml-4">
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
        </div>
        <div className="text-center mt-2 text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  );
};

export default PMMDetailsPage;
