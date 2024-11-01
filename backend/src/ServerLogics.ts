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
/**
 * GET /
 * Sample route to check if the server is running.
 * @returns A welcome message.
 */
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the BC Cancer Donor System backend!");
});

// Route to get donor list (default limit is 1)
/**
 * GET /api/bccancer/donors
 * Fetches a list of donors with an optional limit on the number of results.
 * @param req.query.limit - The maximum number of results to return (default is 1).
 * @returns A list of donors or an error response.
 */
app.get("/api/bccancer/donors", async (req: Request, res: Response<DonorsResponse | ErrorResponse>) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 1;
    const apiUrl = `https://bc-cancer-faux.onrender.com/donors?limit=${limit}&format=json`;

    const response = await axios.get<DonorsResponse>(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching donor data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to fetch cities
/**
 * GET /api/bccancer/cities
 * Fetches a list of cities.
 * @returns A list of cities or an error response.
 */
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

/**
 * Fetches donor data from specified cities with a limit on the number of results.
 * @param cities - A single city or an array of cities to fetch donor data from.
 * @param limit - The maximum number of results to return (default is 1).
 * @returns A promise that resolves to the event response or an error response.
 */
export async function fetchDonorsByCities(
  cities: string | string[],
  limit: number = 1
): Promise<EventResponse | ErrorResponse> {
  try {
    const cityArray = Array.isArray(cities) ? cities : [cities];
    const queryParams = cityArray.map(city => `cities=${encodeURIComponent(city)}`).join('&');
    const apiUrl = `https://bc-cancer-faux.onrender.com/event?${queryParams}&limit=${limit}&format=json`;

    // Fetch event data from the external API
    const response = await axios.get<EventResponse>(apiUrl);
    return response.data;
  } catch (error) {
    console.error("Error fetching donor data:", error);
    return { message: "Internal Server Error" };
  }
}

// Route to generate matched donor list based on selected cities and limit
/**
 * GET /api/bccancer/search-donors
 * Fetches a list of donors based on selected cities and limit.
 * @param req.query.cities - A single city or an array of cities to fetch donor data from.
 * @param req.query.limit - The maximum number of results to return (default is 1).
 * @returns A list of donors or an error response.
 */
app.get("/api/bccancer/search-donors", async (req: Request, res: Response<EventResponse | ErrorResponse>): Promise<void> => {
  try {
    const cities = req.query.cities as string | string[];
    const limit = parseInt(req.query.limit as string, 10) || 1;

    // Ensure at least one city is provided
    if (!cities || (Array.isArray(cities) && cities.length === 0)) {
      res.status(400).json({ message: "At least one city must be provided." });
      return;
    }

    // Fetch donors
    const matchedDonors = await fetchDonorsByCities(cities, limit);
    if ("message" in matchedDonors) {
      res.status(500).json({ message: matchedDonors.message });
    } else {
      res.status(200).json(matchedDonors);
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to fetch all events
/**
 * GET /api/events
 * Fetches all events from the database.
 * @returns A list of events or an error response.
 */
app.get("/api/events", (req: Request, res: Response) => {
  const [statusCode, result] = taskContainer.getEvents();
  res.status(statusCode).json(result);
});

/**
 * Route to create an event
 * POST /api/event
 * Creates a new event in the database.
 * @param req.body - The event details.
 * @returns A success message or an error response.
 */
app.post("/api/event", async (req: Request, res: Response) => {
  const eventDetails: Omit<EventSchema, "event_id"> = req.body;
  const eventResult = taskContainer.addEvent(eventDetails);

  if (eventResult[0] === 200) {
    res.status(200).json({ message: eventResult[1] });
  } else {
    res.status(500).json({ message: "Failed to create event in the database." });
  }
});

/**
 * Route to add a donor to the database
 * POST /api/donor
 * Adds a new donor to the database.
 * @param req.body - The donor details.
 * @returns The donor ID or an error response.
 * 
 * Sample request body:
 * [
 *   {
 *     "first_name": "Shen",
 *     "nick_name": "Sean",
 *     "last_name": "Chen",
 *     "pmm": "Bobby Brown",
 *     "organization_name": "BMO",
 *     "city": "Vancouver",
 *     "total_donations": 13000
 *   }
 * ]
 */
app.post("/api/donor", async (req: Request, res: Response) => {
  const donor: Omit<DonorSchema, "donor_id"> = req.body;
  const [code, donor_id] = taskContainer.addDonor(donor);

  if (code === 200) {
    res.status(200).json({ donor_id });
  } else {
    res.status(500).json({ message: "Failed to add donor to the database." });
  }
});

/**
 * Route to add multiple donors to the database
 * POST /api/donors
 * Adds multiple donors to the database.
 * @param req.body - An array of donor details.
 * @returns A success message or an error response.
 * 
 * Sample request body:
 * [
 *   {
 *     "first_name": "Shen",
 *     "nick_name": "Sean",
 *     "last_name": "Chen",
 *     "pmm": "Bobby Brown",
 *     "organization_name": "BMO",
 *     "city": "Vancouver",
 *     "total_donations": 13000
 *   }
 * ]
 */
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

/**
 * POST /api/tasks
 * Creates tasks for an event based on the provided event ID and donor IDs.
 * @param req.body.eventId - The ID of the event.
 * @param req.body.donorIds - An array of donor IDs.
 * @returns A success message or an error response.
 * 
 * Sample request body:
 * {
 *   "eventId": 1,
 *   "donorIds": [3, 4]
 * }
 */
app.post("/api/tasks", async (req: Request, res: Response) => {
  const { eventId, donorIds } = req.body;  // eventId and array of donorIds

  const taskCreationResult = taskContainer.createTasksForEvent(eventId, donorIds);
  if (taskCreationResult[0] === 200) {
    res.status(200).json({ message: taskCreationResult[1] });
  } else {
    res.status(500).json({ message: "Failed to create tasks for matched donors." });
  }
});

/**
 * GET /api/donor/find
 * Finds a donor by their first and last name.
 * @param req.query.firstName - The first name of the donor.
 * @param req.query.lastName - The last name of the donor.
 * @returns The donor details or an error response.
 */
app.get("/api/donor/find", (req: Request, res: Response) => {
  const { firstName, lastName } = req.query;
  const [statusCode, result] = taskContainer.findDonorByName(firstName as string, lastName as string);
  res.status(statusCode).json(result);
});

/**
 * Route to set up an event (create event, fetch donors, add donors, create tasks)
 * POST /api/setup-event
 * Sets up an event by creating the event, fetching donors, adding donors, and creating tasks.
 * @param req.body.name - The name of the event.
 * @param req.body.location - The location of the event.
 * @param req.body.date - The date of the event.
 * @param req.body.description - The description of the event.
 * @param req.body.cities - An array of cities to fetch donor data from.
 * @param req.body.limit - The maximum number of results to return (default is 1).
 * @returns A success message or an error response.
 * 
 * Sample request body:
 * {
 *   "name": "Test1",
 *   "location": "Vancouver",
 *   "date": "2024-12-15",
 *   "description": "An annual event to gather donors for the support of cancer research initiatives.",
 *   "cities": ["Vancouver", "Burnaby"],
 *   "limit": 50
 * }
 */
app.post("/api/setup-event", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location, date, description, cities, limit } = req.body;

    // Step 1: Create the event
    const eventResult = taskContainer.addEvent({ name, location, date, description });
    if (eventResult[0] !== 200) {
      res.status(500).json({ message: "Failed to create event in the database." });
      return;
    }
    const eventId = eventResult[1]; // Event ID should already be a number
    // console.log(`Event created with ID: ${eventId}`);

    // Step 2: Fetch donors based on cities and limit from the external API
    const matchedDonors = await fetchDonorsByCities(cities, limit);
    if (!("data" in matchedDonors)) {
      res.status(500).json({ message: matchedDonors.message });
      return;
    }
    // console.log("Matched donors:", matchedDonors.data);

    // Step 3: Prepare donor records for insertion
    const donorIds: number[] = [];
    const donorRecords: Omit<DonorSchema, "donor_id">[] = matchedDonors.data.map(donor => ({
      first_name: donor[5] as string,
      nick_name: donor[6] as string,
      last_name: donor[7] as string,
      pmm: donor[0] as string,
      organization_name: donor[8] as string,
      city: donor[20] as string,
      total_donations: donor[9] as number,
    }));

    for (const donorRecord of donorRecords) {
      // Check if donor already exists
      const existingDonor = taskContainer.findDonorByName(donorRecord.first_name, donorRecord.last_name);
      let donorId: number | null = null;

      if (existingDonor[0] === 200) {
        // Donor exists, use the existing donor_id
        donorId = (existingDonor[1] as DonorSchema).donor_id;
      } else if (existingDonor[0] === 404) {
        // Donor does not exist, add to the database
        const addDonorResult = taskContainer.addDonor(donorRecord);
        if (addDonorResult[0] !== 200) {
          res.status(500).json({ message: "Failed to add donor to the database." });
          return;
        }
        donorId = addDonorResult[1];
      } else {
        // Handle any unexpected error
        res.status(500).json({ message: "Unexpected error when checking for existing donor." });
        return;
      }
      
      if (donorId !== null) {
        // Collect donor_id for task creation
        donorIds.push(donorId);
      }
    }

    // Step 4: Create tasks for each donor and the event
    const taskCreationResult = taskContainer.createTasksForEvent(eventId as number, donorIds);

    if (taskCreationResult[0] === 200) {
      res.status(200).json({
        message: `Event setup completed with event ID: ${eventId}`,
        event_id: eventId,
        tasks_status: taskCreationResult[1],
      });
    } else {
      res.status(500).json({ message: "Failed to create tasks for matched donors." });
    }
  } catch (error) {
    console.error("Error in setting up event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




export { app };