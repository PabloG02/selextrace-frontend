TOKEN=$(grep -o '"token":"[^"]*' csrf_response.json | cut -d'"' -f4)
EMAIL="debug-json-token-$(date +%s)@example.com"
echo "Using token: $TOKEN"
echo "Using email: $EMAIL"
curl -v -b cookies.txt \
     -H "X-XSRF-TOKEN: $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"$EMAIL\", \"password\": \"Root.12345\", \"displayName\": \"root\"}" \
     http://localhost:8080/api/auth/signup
