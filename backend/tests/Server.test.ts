import request from 'supertest';
import { app } from '../src/ServerLogics';

describe("API Routes", () => {
  afterAll((done) => {
    done();  // Make sure all resources are released
  });

  it("GET / - should return a welcome message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello from the BC Cancer Donor System backend!");
  });

  it("GET /api/bccancer/donors - should fetch donor list with default limit", async () => {
    const response = await request(app).get("/api/bccancer/donors");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("headers");
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it("GET /api/donors?limit=3 - should fetch donor list with specified limit", async () => {
    const response = await request(app).get("/api/bccancer/donors?limit=3");
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
  });

  it("GET /api/cities - should fetch cities list", async () => {
    const response = await request(app).get("/api/bccancer/cities");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data[0]).toHaveProperty("id");
    expect(response.body.data[0]).toHaveProperty("name");
  });

  it("GET /api/bccancer/search-donors without cities - should return error for missing cities", async () => {
    const response = await request(app).get("/api/bccancer/search-donors");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("At least one city must be provided.");
  });

  it("GET /api/bccancer/search-donors with cities - should fetch event data for given cities", async () => {
    const response = await request(app)
      .get("/api/bccancer/search-donors")
      .query({ cities: ["Vancouver", "Victoria"], limit: 2 });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("headers");
    expect(response.body).toHaveProperty("data");
  });
});