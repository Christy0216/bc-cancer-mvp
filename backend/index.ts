import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// Sample route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the BC Cancer Donor System backend!");
});

// Route to get donor list (default limit is 1)
app.get("/api/donors", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 1;
    const apiUrl = `https://bc-cancer-faux.onrender.com/donors?limit=${limit}&format=json`;

    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching donor data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
