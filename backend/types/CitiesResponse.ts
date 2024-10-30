// City interface to represent each city object
export interface City {
  id: number;
  name: string;
}

// CitiesResponse interface to represent the entire response object
export interface CitiesResponse {
  data: City[];
}