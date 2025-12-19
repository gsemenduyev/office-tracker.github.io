exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const payload = JSON.parse(event.body);
  console.log("Received Netlify notification:", payload);

  // You can now process the payload.
  // For example, you could store it in Firebase.

  return {
    statusCode: 200,
    body: "Notification received.",
  };
};
