#!/bin/bash

echo "=== SailorChat API Endpoint Testing ==="
echo

BASE_URL="http://localhost:3001/api"

echo "1. Testing Health Endpoint..."
curl -s -X GET "$BASE_URL/health" | jq '.'
echo

echo "2. Testing Chat Endpoints (without auth - should fail)..."

echo "2a. GET /api/chats (getUserChats)"
curl -s -X GET "$BASE_URL/chats" | jq '.'
echo

echo "2b. POST /api/chats (createChat)"
curl -s -X POST "$BASE_URL/chats" \
  -H "Content-Type: application/json" \
  -d '{"type":"group","name":"Test Chat"}' | jq '.'
echo

echo "2c. GET /api/chats/search (searchChats)"
curl -s -X GET "$BASE_URL/chats/search?query=test" | jq '.'
echo

echo "2d. POST /api/chats/{id}/join (joinChat)"
curl -s -X POST "$BASE_URL/chats/550e8400-e29b-41d4-a716-446655440000/join" | jq '.'
echo

echo "3. Testing User Endpoints (without auth - should fail)..."

echo "3a. GET /api/users/search (searchUsers)"
curl -s -X GET "$BASE_URL/users/search?query=test" | jq '.'
echo

echo "3b. GET /api/users/{id} (getUserProfile)"
curl -s -X GET "$BASE_URL/users/550e8400-e29b-41d4-a716-446655440000" | jq '.'
echo

echo "4. Testing Validation..."

echo "4a. Search with short query (should fail validation if auth were present)"
curl -s -X GET "$BASE_URL/chats/search?query=a" | jq '.'
echo

echo "4b. Invalid chat type (should fail validation if auth were present)"
curl -s -X POST "$BASE_URL/chats" \
  -H "Content-Type: application/json" \
  -d '{"type":"invalid","name":"Test Chat"}' | jq '.'
echo

echo "=== Testing Complete ==="
echo "Note: All requests should fail with authentication errors,"
echo "which means the endpoints are accessible and auth middleware is working."
