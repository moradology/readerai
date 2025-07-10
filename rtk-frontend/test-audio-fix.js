// Quick test to verify the audio streaming fix
// Run this in the browser console on the Audio tab

// Test 1: Click play without starting stream first
console.log("Test 1: Testing play without stream initialization");
const playButton = document.querySelector('button[class*="bg-green"]');
if (playButton) {
  playButton.click();
  console.log("Clicked play button - check for errors in console");
}

// Test 2: After error, try proper initialization
setTimeout(() => {
  console.log("\nTest 2: Testing proper initialization flow");
  console.log("The error should show 'Stream not initialized. Call startStream() first.'");
  console.log("Not the previous 'Cannot read properties of null' error");
}, 2000);
