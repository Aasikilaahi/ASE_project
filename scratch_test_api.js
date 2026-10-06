const http = require('http');

const data = JSON.stringify({
  registrationNo: "TEST-" + Math.floor(Math.random() * 1000),
  model: "Test Model",
  capacity: "50",
  mileage: "10,000",
  status: "Active",
  fuelType: "Diesel",
  depotId: "global", // assuming global or a known depot
  licenseExpiry: "",
  insuranceExpiry: "",
  assignedDriverId: ""
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/vehicles',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    // Need mock session cookie if authentication is required!
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
