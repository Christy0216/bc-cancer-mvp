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

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<TaskAndDonor[]>([]);
  const [approvedTasks, setApprovedTasks] = useState<TaskAndDonor[]>([]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventResponse = await axios.get<Event[]>("/api/events");
        const foundEvent = eventResponse.data.find(
          (e) => e.event_id === parseInt(eventId!, 10)
        );
        setEvent(foundEvent || null);

        if (foundEvent) {
          const taskResponse = await axios.get<Task[]>("/api/tasks");
          const relatedTasks = taskResponse.data.filter(
            (task) => task.event_id === foundEvent.event_id
          );
          setTasks(relatedTasks);

          // Fetch unique donor IDs
          const donorIds = [...new Set(relatedTasks.map((task) => task.donor_id))];
          const donorPromises = donorIds.map((id) =>
            axios.get<Donor>(`/api/donors/${id}`)
          );
          const donorResults = await Promise.all(donorPromises);
          setDonors(donorResults.map((result) => result.data));
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching event details or related data:", error);
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);
  useEffect(() => {
    const fetchTasksByEvent = async () => {
      try {
        const tasksAndDonorsResponse = await axios.get<TaskAndDonor[]>(`/api/tasks/${eventId}`);
        console.log(tasksAndDonorsResponse);
        if (tasksAndDonorsResponse.data != null) {
         const tasksAndDonorsArray = tasksAndDonorsResponse.data;
         console.log(tasksAndDonorsArray);
         tasksAndDonorsArray.map((task)  => {
            if (task.status === "pending") {
              setPendingTasks([...pendingTasks, task]);
            } else if (task.status === "approved") {
              setApprovedTasks([...approvedTasks, task]);
            }
         });

        }
      } catch (error) {
        console.error("Error fetching tasks by event:", error);
      }
    };
    fetchTasksByEvent();
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

  // Calculate the task statuses for each PMM
  const taskStatsByPMM = donors.map((donor) => {
    // may NEEDS TO FETCH DATA BY EVENT NOT PPM!!!!!
    const donorTasks = tasks.filter((task) => task.donor_id === donor.donor_id);
    const pendingCount = donorTasks.filter((task) => task.status === "pending").length;
    const approvedCount = donorTasks.filter((task) => task.status === "approved").length;
    const rejectedCount = donorTasks.filter((task) => task.status === "rejected").length;

    return {
      pmm: donor.pmm,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">{event.name}</h1>
        <p className="text-lg mb-2"><strong>Date:</strong> {event.date}</p>
        <p className="text-lg mb-4"><strong>Location:</strong> {event.location}</p>
        <p className="text-md mb-6">{event.description}</p>

        {/* Three columns for PMM stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">Pending</h2>
            {taskStatsByPMM.map((stat, index) => (
              <p key={index} className="text-center text-gray-700">{stat.pmm}: {stat.pending}</p>
            ))}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">Completed</h2>
            {taskStatsByPMM.map((stat, index) => (
              <p key={index} className="text-center text-gray-700">{stat.pmm}: {stat.approved + stat.rejected}</p>
            ))}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">Invited</h2>
            {taskStatsByPMM.map((stat, index) => (
              <p key={index} className="text-center text-gray-700">{stat.pmm}: {stat.approved}</p>
            ))}
          </div>
        </div>

        {/* First table */}
        <h2 className="text-2xl font-bold mb-4">Task</h2>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task</th>
              <th className="border px-4 py-2 text-left">Donor</th>
              <th className="border px-4 py-2 text-left">PMM</th>
              <th className="border px-4 py-2 text-left">City</th>
            </tr>
          </thead>
          <tbody>
            {pendingTasks.map((stat, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{stat.task_id}</td>
                <td className="border px-4 py-2">{stat.first_name}</td>
                <td className="border px-4 py-2">{stat.pmm}</td>
                <td className="border px-4 py-2">{stat.city}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Second table */}
        <h2 className="text-2xl font-bold mb-4">Task Complete: Invited</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Task</th>
              <th className="border px-4 py-2 text-left">Pending Number</th>
              <th className="border px-4 py-2 text-left">Approve</th>
              <th className="border px-4 py-2 text-left">Reject</th>
            </tr>
          </thead>
          <tbody>
            {taskStatsByPMM.map((stat, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{stat.pmm}</td>
                <td className="border px-4 py-2">{stat.pending}</td>
                <td className="border px-4 py-2">{stat.approved}</td>
                <td className="border px-4 py-2">{stat.rejected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventDetailPage;
