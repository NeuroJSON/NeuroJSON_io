// Listener for messages from the main thread
self.onmessage = function (e) {
  try {
    const { data } = e;

    // Validate input data
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data received for processing.");
    }

    // Perform the processing
    const processedData = processData(data);

    // Send the processed data back to the main thread
    self.postMessage({ success: true, data: processedData });
  } catch (error) {
    // Handle errors and send error details back
    self.postMessage({ success: false, error: error.message });
  }
};

// Function to perform heavy data processing
function processData(data) {
  // Example: Flatten deeply nested JSON
  return flattenJSON(data);
}

// Example: A utility function to flatten JSON
function flattenJSON(obj, parentKey = "", result = {}) {
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        flattenJSON(obj[key], newKey, result); // Recursive call for nested objects
      } else {
        result[newKey] = obj[key]; // Add to flattened result
      }
    }
  }
  return result;
}
