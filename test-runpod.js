#!/usr/bin/env node

// Test script for Runpod endpoint
// Usage: node test-runpod.js "YOUR_RUNPOD_API_KEY"

const RUNPOD_ENDPOINT = 'https://api.runpod.ai/v2/xez46ruk06q834/run';
const API_KEY = process.argv[2] || 'YOUR_RUNPOD_API_KEY';

async function testRunpod() {
  console.log('🚀 Testing Runpod Endpoint...');
  console.log('Endpoint:', RUNPOD_ENDPOINT);
  console.log('-----------------------------------\n');

  const payload = {
    input: {
      prompt: "A beautiful sunset over mountains with golden clouds",
      parameters: {
        temperature: 0.7,
        guidance_scale: 7.5
      }
    }
  };

  try {
    console.log('📤 Sending request...');
    const response = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Response received!\n');

    // Check if it's async (returns job ID) or sync (returns result)
    if (result.id) {
      console.log('Job ID:', result.id);
      console.log('Status:', result.status);

      if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
        console.log('\n⏳ Job queued/processing. Check status at:');
        console.log(`https://api.runpod.ai/v2/xez46ruk06q834/status/${result.id}`);

        // Poll for result
        await pollForResult(result.id, API_KEY);
      }
    } else if (result.output) {
      console.log('Direct result received:');
      displayResult(result.output);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your API key is correct');
    console.log('2. Verify the endpoint is active in Runpod dashboard');
    console.log('3. Check if container is running');
  }
}

async function pollForResult(jobId, apiKey, maxAttempts = 10) {
  console.log('\n⏳ Polling for result...');
  const statusUrl = `https://api.runpod.ai/v2/xez46ruk06q834/status/${jobId}`;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      const result = await response.json();
      console.log(`Attempt ${i + 1}: ${result.status}`);

      if (result.status === 'COMPLETED') {
        console.log('\n✅ Job completed!');
        displayResult(result.output);
        return;
      } else if (result.status === 'FAILED') {
        console.error('❌ Job failed:', result.error);
        return;
      }
    } catch (error) {
      console.error('Error polling:', error.message);
    }
  }

  console.log('⏱️ Timeout: Job still processing');
}

function displayResult(output) {
  console.log('\n📊 Result Details:');
  console.log('-----------------------------------');

  if (output.status === 'success') {
    console.log('✅ Status:', output.status);
    console.log('⏱️ Generation Time:', output.generation_time_ms, 'ms');
    console.log('📐 Dimensions:', `${output.width}x${output.height}`);
    console.log('📦 Format:', output.format || 'png');

    if (output.image_base64) {
      console.log('🖼️ Image: Base64 encoded (', output.image_base64.substring(0, 50), '...)');
      console.log('\n💡 Tip: The base64 image can be displayed in HTML as:');
      console.log(`<img src="data:image/png;base64,${output.image_base64.substring(0, 20)}..." />`);
    } else if (output.image_url) {
      console.log('🔗 Image URL:', output.image_url);
    }
  } else {
    console.log('❌ Status:', output.status);
    console.log('Message:', output.message);
  }
}

// Run the test
if (API_KEY === 'YOUR_RUNPOD_API_KEY') {
  console.log('⚠️ Please provide your Runpod API key as an argument:');
  console.log('node test-runpod.js YOUR_API_KEY');
  process.exit(1);
}

testRunpod();