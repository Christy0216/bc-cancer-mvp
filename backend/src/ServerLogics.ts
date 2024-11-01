
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

// Route to set up an event (create event, fetch donors, add donors, create tasks)
app.post("/api/setup-event", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location, date, description, cities, limit } = req.body;

    // Step 1: Create the event
    const eventResult = taskContainer.addEvent({ name, location, date, description });
    if (eventResult[0] !== 200) {
      res.status(500).json({ message: "Failed to create event in the database." });
      return;
    }
    const eventId = eventResult[1]; // Now eventId is already a number
    console.log(`Event created with ID: ${eventId}`);

    // // Step 2: Fetch donors based on cities and limit from the external API
    // const cityArray = Array.isArray(cities) ? cities : [cities];
    // const queryParams = cityArray.map(city => `cities=${encodeURIComponent(city)}`).join('&');
    // const apiUrl = `https://bc-cancer-faux.onrender.com/event?${queryParams}&limit=${limit || 1}&format=json`;
    // const donorResponse = await axios.get<EventResponse>(apiUrl);
    // const matchedDonors = donorResponse.data.data;

    // // Step 3: Add donors to the database
    // const donorRecords = matchedDonors.map(donor => ({
    //   first_name: donor[0] as string,
    //   nick_name: donor[1] as string,
    //   last_name: donor[2] as string,
    //   pmm: donor[3] as string,
    //   organization_name: donor[4] as string,
    //   city: donor[5] as string,
    //   total_donations: donor[6] as number,
    // }));
    // const donorsResult = taskContainer.addDonors(donorRecords);
    // if (donorsResult[0] !== 200) {
    //   res.status(500).json({ message: "Failed to add donors to the database." });
    //   return;
    // }

    // // Step 4: Create tasks for the event and donors
    // const donorIds = matchedDonors.map((_, index) => index + 1); // Assumes IDs align with order
    // const taskCreationResult = taskContainer.createTasksForEvent(eventId, donorIds);

    // if (taskCreationResult[0] === 200) {
    //   res.status(200).json({
    //     message: `Event setup completed with event ID: ${eventId}`,
    //     event_id: eventId,
    //     tasks_status: taskCreationResult[1],
    //   });
    // } else {
    //   res.status(500).json({ message: "Failed to create tasks for matched donors." });
    // }
  } catch (error) {
    console.error("Error in setting up event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



export { app };