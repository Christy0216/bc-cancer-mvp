import React, { useEffect, useState } from "react";
import axios from "axios";

const TestComponent: React.FC = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:5001/")
      .then((response) => setMessage(response.data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return <div>{message}</div>;
};

export default TestComponent;
