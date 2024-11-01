
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

// Function to fetch donors based on cities and limit
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

// Route to find donor by name
app.get("/api/donor/find", (req: Request, res: Response) => {
  const { firstName, lastName } = req.query;
  const [statusCode, result] = taskContainer.findDonorByName(firstName as string, lastName as string);
  res.status(statusCode).json(result);
});

// Route to set up an event (create event, fetch donors, add donors, create tasks)
// app.post("/api/setup-event", async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { name, location, date, description, cities, limit } = req.body;

//     // Step 1: Create the event
//     const eventResult = taskContainer.addEvent({ name, location, date, description });
//     if (eventResult[0] !== 200) {
//       res.status(500).json({ message: "Failed to create event in the database." });
//       return;
//     }
//     const eventId = eventResult[1]; // Now eventId is already a number
//     // console.log(`Event created with ID: ${eventId}`);

//     // Step 2: Fetch donors based on cities and limit from the external API
//     const matchedDonors = await fetchDonorsByCities(cities, limit);
//     if (!("data" in matchedDonors)) {
//       res.status(500).json({ message: matchedDonors.message });
//       return;
//     }
//     // console.log("Matched donors:", matchedDonors.data);

//     // Prepare donor records for insertion
//     const donorRecords: Omit<DonorSchema, "donor_id">[] = matchedDonors.data.map(donor => ({
//       first_name: donor[5] as string,
//       nick_name: donor[6] as string,
//       last_name: donor[7] as string,
//       pmm: donor[0] as string,
//       organization_name: donor[8] as string,
//       city: donor[20] as string,
//       total_donations: donor[9] as number,
//     }));

//     // console.log("Donor records:", donorRecords);
//     for (const donorRecord of donorRecords) {
//       // Check if donor already exists
//       const existingDonor = taskContainer.findDonorByName(donorRecord.first_name, donorRecord.last_name);
//       let donorId: number;

//       if (existingDonor[0] === 200 && existingDonor[1]) {
//         // Use existing donor_id
//         donorId = (existingDonor[1] as DonorSchema).donor_id;
//       } else {
//         // Add new donor to the database
//         const addDonorResult = taskContainer.addDonors([donorRecord]);
//         if (addDonorResult[0] !== 200) {
//           res.status(500).json({ message: "Failed to add a donor to the database." });
//           return;
//         }
//         donorId = this.db.lastInsertRowid; // Retrieve new donor ID
//       }

//       // Collect donor_id for task creation
//       donorIds.push(donorId);
//     }

//     // Step 4: Create tasks for each donor and the event
//     const taskCreationResult = taskContainer.createTasksForEvent(eventId, donorIds);

//     if (taskCreationResult[0] === 200) {
//       res.status(200).json({
//         message: `Event setup completed with event ID: ${eventId}`,
//         event_id: eventId,
//         tasks_status: taskCreationResult[1],
//       });
//     } else {
//       res.status(500).json({ message: "Failed to create tasks for matched donors." });
//     }
//   } catch (error) {
//     console.error("Error in setting up event:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });



export { app };