// Simple test function to verify Netlify functions work
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Netlify function is working!',
      timestamp: new Date().toISOString(),
      test: 'This confirms functions are deployed correctly'
    })
  };
};