curl -X GET http://localhost:5000/api/clinic/consultation-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

  {
  "success": true,
  "data": {
    "current": {
      "tokenNumber": 9,
      "patientName": "Rahul"
    },
    "next": {
      "tokenNumber": 11,
      "patientName": "Aman"
    }
  }
}