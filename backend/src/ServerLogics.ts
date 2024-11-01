
import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import SQLiteContainer from "./SQLiteContainer";
import { DonorsResponse, City, CitiesResponse, EventResponse, ErrorResponse, DonorSchema, EventSchema, TaskSchema, TaskContainerInterface } from "./Types";

/** Server **/

const app = express();
app.use(cors());
app.use(express.json());

const taskContainer = new SQLiteContainer('production');

// Sample route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the BC Cancer Donor System backend!");
});

// Route to get donor list (default limit is 1)
app.get("/api/bccancer/donors", async (req: Request, res: Response<DonorsResponse | ErrorResponse>) => {
  try {
    const limit = req.query.limit || 1;
    const apiUrl = `https://bc-cancer-faux.onrender.com/donors?limit=${limit}&format=json`;

    const response = await axios.get<DonorsResponse>(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching donor data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to fetch cities
app.get("/api/bccancer/cities", async (req: Request, res: Response<CitiesResponse | ErrorResponse>) => {
  try {
    const apiUrl = "https://bc-cancer-faux.onrender.com/cities?format=json";
    const response = await axios.get(apiUrl);

    // Format the data to match the frontend's expected structure
    const formattedCities: City[] = response.data.data.map((cityArray: any[], index: number) => ({
      id: index,
      name: cityArray[0],
    }));

    // Send the formatted data as JSON response
    res.json({ data: formattedCities });
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ message: "Failed to fetch cities." });
  }
});

// Route to generate matched donor list based on selected cities and limit
app.get("/api/bccancer/search-donors", async (req: Request, res: Response<EventResponse | ErrorResponse>): Promise<void> => {
  try {
    const cities = req.query.cities;
    const limit = req.query.limit || 1;

    // Ensure at least one city is provided
    if (!cities || (Array.isArray(cities) && cities.length === 0)) {
      res.status(400).json({ message: "At least one city must be provided." });
      return;
    }

    // Handle cities array or single city case
    const cityArray = Array.isArray(cities) ? cities : [cities as string];
    const queryParams = cityArray
      .map(city => `cities=${encodeURIComponent(city as string)}`)
      .join('&');

    // Build the API URL
    const apiUrl = `https://bc-cancer-faux.onrender.com/event?${queryParams}&limit=${limit}&format=json`;

    // Fetch event data from the external API
    const response = await axios.get<EventResponse>(apiUrl);

    // Send the fetched data back to the client
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to fetch all events
app.get("/api/events", (req: Request, res: Response) => {
  const [statusCode, result] = taskContainer.getEvents();
  res.status(statusCode).json(result);
});

// Route to create an event
app.post("/api/event", async (req: Request, res: Response) => {
  const eventDetails: Omit<EventSchema, "event_id"> = req.body;
  const eventResult = taskContainer.addEvent(eventDetails);
  
  if (eventResult[0] === 200) {
    res.status(200).json({ message: eventResult[1] });
  } else {
    res.status(500).json({ message: "Failed to create event in the database." });
  }
});

// Route to add donors
app.post("/api/donors", async (req: Request, res: Response) => {
  const donors: Omit<DonorSchema, "donor_id">[] = req.body;
  const [code, message] = taskContainer.addDonors(donors);

  if (code === 200) {
    res.status(200).json({ message });
  } else {
    res.status(500).json({ message: "Failed to add donors to the database." });
  }
});

// Route to fetch donors
app.get("/api/donors", (req: Request, res: Response) => {
  const [statusCode, result] = taskContainer.getDonors();
  res.status(statusCode).json(result);
});

// Route to fetch tasks
app.get("/api/tasks", (req: Request, res: Response) => {
  const [statusCode, result] = taskContainer.getTasks();
  res.status(statusCode).json(result);
});

// Route to create tasks for an event
app.post("/api/tasks", async (req: Request, res: Response) => {
  const { eventId, donorIds } = req.body;  // eventId and array of donorIds
  
  const taskCreationResult = taskContainer.createTasksForEvent(eventId, donorIds);
  if (taskCreationResult[0] === 200) {
    res.status(200).json({ message: taskCreationResult[1] });
  } else {
    res.status(500).json({ message: "Failed to create tasks for matched donors." });
  }
});



export { app };