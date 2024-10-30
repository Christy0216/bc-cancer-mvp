import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import { DonorsResponse } from "./types/DonorsResponse";
import { CitiesResponse, City } from "./types/CitiesResponse";
import { ErrorResponse } from "./types/ErrorResponse";

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
