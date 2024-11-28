import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Chart } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

// Custom plugin to add text in the center of the doughnut chart
const centerTextPlugin = {
  id: "centerText",
  beforeDraw(chart: Chart) {
    const { ctx, width, height } = chart;
    const data = chart.config.data?.datasets[0]?.data[0] as number;

    ctx.save();
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${data}%`, width / 2, height / 2);
    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

type Event = {
  event_id: number;
  name: string;
  date: string;
};

type Task = {
  task_id: number;
  event_id: number;
  status: "pending" | "approved" | "rejected";
};

type EventWithStatus = Event & {
  pending: number;
  approved: number;
  rejected: number;
};


const EventPage: React.FC = () => {
  const [events, setEvents] = useState<EventWithStatus[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventsAndTasks = async () => {
      try {
        const eventResponse = await axios.get<Event[]>("/api/events");
        const events = eventResponse.data;

        const taskResponse = await axios.get<Task[]>("/api/tasks");
        const tasks = taskResponse.data;

        const eventsWithStatus = events.map((event) => {
          const eventTasks = tasks.filter(
            (task) => task.event_id === event.event_id
          );
          const totalTasks = eventTasks.length;

          const pending = Math.round((eventTasks.filter((task) => task.status === "pending").length / totalTasks) * 100) || 0;
          const approved = Math.round((eventTasks.filter((task) => task.status === "approved").length / totalTasks) * 100) || 0;
          const rejected = Math.round((eventTasks.filter((task) => task.status === "rejected").length / totalTasks) * 100) || 0;

          return {
            ...event,
            pending,
            approved,
            rejected,
          };
        });
        // sort events based on date 
        const sortedEventsWithStatus = eventsWithStatus.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setEvents(sortedEventsWithStatus);
      } catch (error) {
        console.error("Error fetching events or tasks:", error);
      }
    };

    fetchEventsAndTasks();
  }, []);

  const handleCreateEvent = () => {
    navigate("/create-event");
  };

  const handleMyTasksClick = () => {
    console.log('username:', sessionStorage.getItem('userName'));
    
    const isPMM = sessionStorage.getItem("isPMM") === "true";
    if (isPMM) {
      const pmmName = sessionStorage.getItem("pmmName");
      navigate(`/pmm/${pmmName}`);
    } else {
      alert("You do not have permission to access this page. Only PMMs can view tasks.");
    }
  };

  const handleEventClick = (eventId: number) => {
    navigate(`/event/${eventId}`);
  };

  const renderChart = (data: number, label: string, color: string) => (
    <div className="flex flex-col items-center">
      <Doughnut
        data={{
          labels: [label, ""],
          datasets: [
            {
              data: [data, 100 - data],
              backgroundColor: [color, "#e0e0e0"],
              borderWidth: 0,
            },
          ],
        }}
        options={{
          cutout: "70%",
          plugins: {
            tooltip: { enabled: false },
            legend: { display: false },
          },
          responsive: true,
          maintainAspectRatio: true,
        }}
        className="w-20 h-20"
      />
      <p className="text-sm mt-2 text-gray-600">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Events
        </h1>
        {sessionStorage.getItem("isPMM") !== "true" && (
          <button
            onClick={handleCreateEvent}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg mb-6 transition duration-300 ease-in-out"
          >
            New Event
          </button>
        )}
        {sessionStorage.getItem("isPMM") === "true" && (
          <button
            onClick={handleMyTasksClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mb-6 transition duration-300 ease-in-out"
          >
            My Tasks
          </button>
        )}
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.event_id}
              className="bg-gray-100 rounded-lg p-4 shadow-sm transition-transform duration-200 flex items-center justify-between"
              onClick={() => handleEventClick(event.event_id)}
            >
              <p className="text-xl font-semibold text-gray-700 flex-grow">
                {event.name}
              </p>
              <div className="flex-grow">
                <p className="text-xl font-semibold text-gray-700">
                  {event.name}
                </p>
              <p className="text-sm text-gray-500">
          {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString()}
        </p>
      </div>
              <div className="flex space-x-6">
                {renderChart(event.pending, "Pending", "#fbbf24")}
                {renderChart(event.approved, "Approved", "#34d399")}
                {renderChart(event.rejected, "Rejected", "#f87171")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventPage;
