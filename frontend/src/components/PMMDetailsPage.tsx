import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
  FaTimes,
  FaExclamationCircle,
} from "react-icons/fa";

type Task = {
  task_id: number;
  event_id: number;
  donor_id: number;
  donor_name: string;
  status: "pending" | "approved" | "rejected";
  reason?: string | null; // Added reason field
};

type PMMSummary = {
  pmm: string;
  pendingCount: number;
  completedCount: number;
};

const PMMDetailsPage: React.FC = () => {
  const { pmmName } = useParams<{ pmmName: string }>();
  const decodedPmmName = decodeURIComponent(pmmName || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pmmSummary, setPmmSummary] = useState<PMMSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  const [jumpToPage, setJumpToPage] = useState(currentPage.toString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false); // For expandable completed tasks

  useEffect(() => {
    const fetchPMMDetailsAndTasks = async () => {
      try {
        const pmmResponse = await axios.get<string[]>("/api/pmm");
        const pmmList = pmmResponse.data;
        const isValidPMM = pmmList.includes(decodedPmmName);

        if (!isValidPMM) {
          setLoading(false);
          return;
        }

        const response = await axios.get<Task[]>(
          `/api/tasks-of-pmm/${decodedPmmName}`
        );
        const fetchedTasks = response.data;
        console.log("Fetched tasks for PMM:", fetchedTasks);

        setTasks(fetchedTasks);

        const pendingCount = fetchedTasks.filter(
          (task) => task.status === "pending"
        ).length;
        const completedCount = fetchedTasks.filter(
          (task) =>
            task.status === "approved" || task.status === "rejected"
        ).length;

        setPmmSummary({
          pmm: decodedPmmName,
          pendingCount,
          completedCount,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching tasks for PMM:", error);
        setLoading(false);
      }
    };

    fetchPMMDetailsAndTasks();
  }, [decodedPmmName]);

  const closeModal = () => {
    setSelectedTask(null);
    setIsModalOpen(false);
    setRejectionReason("");
    setError(null);
    setSuccess(null);
  };

  const handleApprove = async (task_id: number) => {
    try {
      await axios.put("/api/task", { taskId: task_id, status: "approved" });
      setSuccess("Task approved successfully.");
      // Update the task status locally
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.task_id === task_id ? { ...task, status: "approved" } : task
        )
      );
    } catch (err) {
      console.error("Error approving task:", err);
      setError("Failed to approve the task.");
    }
  };

  const handleReject = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleRejectionReasonChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setRejectionReason(e.target.value);
  };

  const submitRejection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (rejectionReason.trim() === "") {
      setError("Rejection reason cannot be empty.");
      return;
    }

    try {
      await axios.put("/api/task", {
        taskId: selectedTask.task_id,
        status: "rejected",
        reason: rejectionReason.trim(),
      });
      setSuccess("Task rejected successfully.");
      // Update the task status locally with the reason
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.task_id === selectedTask.task_id
            ? { ...task, status: "rejected", reason: rejectionReason.trim() }
            : task
        )
      );
      closeModal();
    } catch (err) {
      console.error("Error rejecting task:", err);
      setError("Failed to reject the task.");
    }
  };

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
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const completedTasks = tasks.filter(
    (task) => task.status === "approved" || task.status === "rejected"
  );

  // Pagination logic based on pending tasks
  const totalPages = Math.ceil(pendingTasks.length / tasksPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setJumpToPage(newPage.toString());
  };

  const handleJumpToPageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (value === "") {
      setJumpToPage("");
      return;
    }
    const page = parseInt(value, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setJumpToPage(value);
    }
  };

  const jumpToPageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    }
  };

  const handleFirstPage = () => handlePageChange(1);
  const handleLastPage = () => handlePageChange(totalPages);
  const handleNextPage = () => handlePageChange(currentPage + 1);
  const handlePreviousPage = () => handlePageChange(currentPage - 1);

  // Toggle for expandable completed tasks
  const toggleCompletedTasks = () => {
    setIsCompletedExpanded(!isCompletedExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">
          PMM: {pmmSummary.pmm}
        </h1>
        <p className="text-lg mb-4">
          Pending Tasks: {pmmSummary.pendingCount}
        </p>
        <p className="text-lg mb-6">
          Completed Tasks: {pmmSummary.completedCount}
        </p>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Table for Pending Tasks */}
        <h2 className="text-2xl font-bold mb-4">Pending Tasks</h2>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task ID</th>
              <th className="border px-4 py-2 text-left">Event ID</th>
              <th className="border px-4 py-2 text-left">Donor</th>
              <th className="border px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingTasks
              .slice(
                (currentPage - 1) * tasksPerPage,
                currentPage * tasksPerPage
              )
              .map((task) => (
                <tr key={task.task_id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{task.task_id}</td>
                  <td className="border px-4 py-2">{task.event_id}</td>
                  <td className="border px-4 py-2">{task.donor_name}</td>
                  <td className="border px-4 py-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(task.task_id)}
                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                        aria-label={`Approve Task ${task.task_id}`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(task)}
                        className="flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                        aria-label={`Reject Task ${task.task_id}`}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination Controls for Pending Tasks */}
        {pendingTasks.length > tasksPerPage && (
          <div className="flex justify-center items-center mt-4 space-x-2">
            <button
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-full border border-gray-300 hover:bg-gray-100 ${
                currentPage === 1
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
              aria-label="Go to first page"
            >
              <FaAngleDoubleLeft />
            </button>
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-full border border-gray-300 hover:bg-gray-100 ${
                currentPage === 1
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
              aria-label="Go to previous page"
            >
              <FaAngleLeft />
            </button>
            <form onSubmit={jumpToPageSubmit} className="flex items-center ml-4">
              <input
                type="number"
                value={jumpToPage}
                onChange={handleJumpToPageChange}
                className="w-14 px-2 py-1 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                min="1"
                max={totalPages}
                aria-label="Jump to page"
              />
              <button
                type="submit"
                className="ml-2 text-blue-600 hover:underline focus:outline-none"
              >
                Go
              </button>
            </form>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-full border border-gray-300 hover:bg-gray-100 ${
                currentPage === totalPages
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
              aria-label="Go to next page"
            >
              <FaAngleRight />
            </button>
            <button
              onClick={handleLastPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-full border border-gray-300 hover:bg-gray-100 ${
                currentPage === totalPages
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
              aria-label="Go to last page"
            >
              <FaAngleDoubleRight />
            </button>
          </div>
        )}
        {pendingTasks.length > tasksPerPage && (
          <div className="text-center mt-2 text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        )}

        {/* Table for Completed Tasks */}
        <h2 className="text-2xl font-bold mb-4 mt-8">Completed Tasks</h2>
        {/* Optional: Expand/Collapse Button */}
        {completedTasks.length > 0 && (
          <button
            onClick={toggleCompletedTasks}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {isCompletedExpanded ? "Hide Completed Tasks" : "Show Completed Tasks"}
          </button>
        )}
        {/* Completed Tasks Table */}
        {isCompletedExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left">Task ID</th>
                  <th className="border px-4 py-2 text-left">Event ID</th>
                  <th className="border px-4 py-2 text-left">Donor</th>
                  <th className="border px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{task.task_id}</td>
                    <td className="border px-4 py-2">{task.event_id}</td>
                    <td className="border px-4 py-2">{task.donor_name}</td>
                    <td className="border px-4 py-2 capitalize flex items-center">
                      {task.status}
                      {task.status === "rejected" && task.reason && (
                        <span className="inline-block ml-2 text-red-500 relative group">
                          <FaExclamationCircle className="cursor-pointer" />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-max bg-gray-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            {task.reason}
                          </div>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Optionally, show a message if there are no completed tasks */}
        {completedTasks.length === 0 && (
          <p className="text-gray-600">No completed tasks available.</p>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
            <h2 className="text-2xl font-bold mb-4">Reject Task</h2>
            <p className="mb-4">
              Please provide a reason for rejecting Task ID:{" "}
              <span className="font-semibold">{selectedTask.task_id}</span>
            </p>
            <form onSubmit={submitRejection}>
              <textarea
                value={rejectionReason}
                onChange={handleRejectionReasonChange}
                className="w-full border rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Enter rejection reason..."
                rows={4}
                required
              ></textarea>
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PMMDetailsPage;
