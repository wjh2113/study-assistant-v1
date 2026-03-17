const { Queue, Worker } = require('bullmq');

async function testBullMQ() {
  // Connect to Redis in WSL2 using WSL2 IP address
  const queue = new Queue('test-queue', {
    connection: {
      host: '172.26.168.165',  // WSL2 IP address
      port: 6379
    }
  });

  try {
    // Add a test job
    await queue.add('test-job', { test: 'data', timestamp: Date.now() });
    console.log('✓ Job added to queue successfully');

    // Get queue info
    const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);
    console.log(`✓ Queue contains ${jobs.length} job(s)`);

    // Get queue stats
    const counts = await queue.getJobCounts();
    console.log('✓ Queue stats:', counts);

    // Clean up
    await queue.close();
    console.log('✓ BullMQ test completed successfully');
    
    return true;
  } catch (error) {
    console.error('✗ BullMQ test failed:', error.message);
    return false;
  }
}

testBullMQ().then(success => {
  process.exit(success ? 0 : 1);
});
