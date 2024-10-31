/** Interface **/

export interface DonorsResponse {
  headers: string[];
  data: (string | number)[][];
}

// City interface to represent each city object
export interface City {
  id: number;
  name: string;
}

// CitiesResponse interface to represent the entire response object
export interface CitiesResponse {
  data: City[];
}

// Define the interface for the API response
export interface EventResponse {
  headers: string[];
  data: (string | number)[][];
}

// ErrorResponse interface to represent the error response
export interface ErrorResponse {
  message: string;
}