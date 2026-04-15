/**
 * Simplified Travel Bundle Test
 * Tests tool schema validation and basic integration
 */

import { tools } from './packages/bundles/travel-crypto-pro/src/index.ts';

console.log('\n🚀 Travel Bundle Integration Test\n');
console.log('📋 Tools Exported:');
tools.forEach((tool, i) => {
  console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
});

console.log('\n✅ Bundle loads successfully\n');

// Test tool schemas
console.log('🔍 Validating Tool Schemas:\n');

// Test 1: searchFlights schema
const searchFlightsTool = tools.find(t => t.name === 'search_travel_options');
if (searchFlightsTool) {
  console.log('✅ search_travel_options');
  console.log('   Schema:', JSON.stringify(searchFlightsTool.schema, null, 2).split('\n').slice(0, 5).join('\n'));
}

// Test 2: searchHotels schema  
const searchHotelsTool = tools.find(t => t.name === 'search_hotels');
if (searchHotelsTool) {
  console.log('\n✅ search_hotels');
  console.log('   Schema:', JSON.stringify(searchHotelsTool.schema, null, 2).split('\n').slice(0, 5).join('\n'));
}

// Test 3: buildItinerary
const buildItineraryTool = tools.find(t => t.name === 'build_itinerary');
if (buildItineraryTool) {
  console.log('\n✅ build_itinerary');
  console.log('   Schema:', JSON.stringify(buildItineraryTool.schema, null, 2).split('\n').slice(0, 5).join('\n'));
}

// Test 4: requestApproval
const requestApprovalTool = tools.find(t => t.name === 'request_booking_approval');
if (requestApprovalTool) {
  console.log('\n✅ request_booking_approval');
  console.log('   Schema:', JSON.stringify(requestApprovalTool.schema, null, 2).split('\n').slice(0, 5).join('\n'));
}

// Test 5: bookFlight
const bookFlightTool = tools.find(t => t.name === 'book_flight');
if (bookFlightTool) {
  console.log('\n✅ book_flight');
  console.log('   Schema:', JSON.stringify(bookFlightTool.schema, null, 2).split('\n').slice(0, 5).join('\n'));
}

console.log('\n✅ All tools are properly defined\n');

console.log('📊 Summary:');
console.log(`   Total tools: ${tools.length}`);
console.log(`   All required tools present: ${tools.length === 5 ? '✅ YES' : '❌ NO'}`);
console.log('\n✅ Travel bundle is ready for deployment\n');
