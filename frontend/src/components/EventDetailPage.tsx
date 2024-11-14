import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

type Event = {
  event_id: number;
  name: string;
  location: string;
  date: string;
  description: string;
};

type Task = {
  task_id: number;
  event_id: number;
  donor_id: number;
  status: "pending" | "approved" | "rejected";
};

type Donor = {
  donor_id: number;
  first_name: string;
  last_name: string;
  pmm: string;
  organization_name: string;
  city: string;
  total_donations: number;
};

type TaskAndDonor = {
  task_id: number;
  event_id: number;
  donor_id: number;
  status: "pending" | "approved" | "rejected";
  first_name: string;
  last_name: string;
  pmm: string;
  organization_name: string;
  city: string;
  total_donations: number;
};

type PMMTaskSummary = {
  pmm: string;
  pendingCount: number;
  completedCount: number;
  invitedCount: number;
};

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<TaskAndDonor[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pmmTaskSummaries, setPmmTaskSummaries] = useState<PMMTaskSummary[]>([]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        // Fetch Event
        const eventResponse = await axios.get<Event[]>("/api/events");
        const foundEvent = eventResponse.data.find(
          (e) => e.event_id === parseInt(eventId!, 10)
        );
        setEvent(foundEvent || null);

        if (foundEvent) {
          // Fetch Tasks related to the Event
          const tasksAndDonorsResponse = await axios.get<TaskAndDonor[]>(`/api/tasks/${eventId}`);
          setTasks(tasksAndDonorsResponse.data);

          // Fetch unique donor IDs
          const donorIds = [...new Set(tasksAndDonorsResponse.data.map((task) => task.donor_id))];
          const donorPromises = donorIds.map((id) =>
            axios.get<Donor>(`/api/donors/${id}`)
          );
          const donorResults = await Promise.all(donorPromises);
          setDonors(donorResults.map((result) => result.data));

          // Fetch tasks summary for each PMM
          const pmmNames = [...new Set(tasksAndDonorsResponse.data.map((task) => task.pmm))];
          const pmmSummaryPromises = pmmNames.map(async (pmm) => {
            const response = await axios.get<Task[]>(`/api/tasks-of-pmm/${pmm}`);
            const tasks = response.data;

            const pendingCount = tasks.filter((task) => task.status === "pending").length;
            const completedCount = tasks.filter(
              (task) => task.status === "approved" || task.status === "rejected"
            ).length;
            const invitedCount = tasks.filter((task) => task.status === "approved").length;

            return {
              pmm,
              pendingCount,
              completedCount,
              invitedCount,
            };
          });

          const pmmTaskSummaries = await Promise.all(pmmSummaryPromises);
          setPmmTaskSummaries(pmmTaskSummaries);
          console.log("PMM Task Summaries:", pmmTaskSummaries); // Debugging line to check the data
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching event details or related data:", error);
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
        <p className="text-2xl text-white">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
        <p className="text-2xl text-white">Event not found.</p>
      </div>
    );
  }

  const pendingTasksCount = tasks.filter((task) => task.status === "pending").length;
  const completedTasks = tasks.filter((task) => task.status === "approved" || task.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">{event.name}</h1>
        <p className="text-lg mb-2"><strong>Date:</strong> {event.date}</p>
        <p className="text-lg mb-4"><strong>Location:</strong> {event.location}</p>
        <p className="text-md mb-6">{event.description}</p>

        {/* Summary table for Pending, Completed, Invited tasks by PMM */}
        <h2 className="text-2xl font-bold mb-4">Summary of Tasks by PMM</h2>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">PMM</th>
              <th className="border px-4 py-2 text-left">Pending Tasks</th>
              <th className="border px-4 py-2 text-left">Completed Tasks</th>
              <th className="border px-4 py-2 text-left">Invited</th>
            </tr>
          </thead>
          <tbody>
            {pmmTaskSummaries.map((summary, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{summary.pmm}</td>
                <td className="border px-4 py-2">{summary.pendingCount}</td>
                <td className="border px-4 py-2">{summary.completedCount}</td>
                <td className="border px-4 py-2">{summary.invitedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* First table: All tasks related to the current event */}
        <h2 className="text-2xl font-bold mb-4">All Tasks for Event</h2>
        <p className="text-lg mb-4">Total Pending Tasks: {pendingTasksCount}</p>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task</th>
              <th className="border px-4 py-2 text-left">Donor</th>
              <th className="border px-4 py-2 text-left">PMM</th>
              <th className="border px-4 py-2 text-left">City</th>
              <th className="border px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{task.task_id}</td>
                <td className="border px-4 py-2">{task.first_name} {task.last_name}</td>
                <td className="border px-4 py-2">{task.pmm}</td>
                <td className="border px-4 py-2">{task.city}</td>
                <td className="border px-4 py-2">{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Second table: Completed tasks related to the current event */}
        <h2 className="text-2xl font-bold mb-4">Completed Tasks</h2>
        <p className="text-lg mb-4">Total Completed Tasks: {completedTasks.length}</p>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task</th>
              <th className="border px-4 py-2 text-left">Donor</th>
              <th className="border px-4 py-2 text-left">PMM</th>
              <th className="border px-4 py-2 text-left">City</th>
              <th className="border px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {completedTasks.map((task, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{task.task_id}</td>
                <td className="border px-4 py-2">{task.first_name} {task.last_name}</td>
                <td className="border px-4 py-2">{task.pmm}</td>
                <td className="border px-4 py-2">{task.city}</td>
                <td className="border px-4 py-2">{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventDetailPage;
