import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import SQLiteContainer from "./SQLiteContainer";

/** Interface **/

interface DonorsResponse {
  headers: string[];
  data: (string | number)[][];
}

// City interface to represent each city object
interface City {
  id: number;
  name: string;
}

// CitiesResponse interface to represent the entire response object
interface CitiesResponse {
  data: City[];
}

// Define the interface for the API response
interface EventResponse {
  headers: string[];
  data: (string | number)[][];
}

// ErrorResponse interface to represent the error response
interface ErrorResponse {
  message: string;
}



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
app.get("/api/donors", async (req: Request, res: Response<DonorsResponse | ErrorResponse>) => {
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
app.get("/api/cities", async (req: Request, res: Response<CitiesResponse | ErrorResponse>) => {
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

// Route to create event based on selected cities and limit
app.get("/api/event", async (req: Request, res: Response<EventResponse | ErrorResponse>) => {
  try {
    const cities = req.query.cities as string[]; // Cities array from query
    const limit = req.query.limit || 1; // Limit from query, default is 1 if not provided

    // Encode the cities as query parameters
    const queryParams = cities.map(city => `cities=${encodeURIComponent(city)}`).join('&');
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




const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});