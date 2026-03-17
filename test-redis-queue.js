const { Queue, Worker } = require('bullmq');

// Use WSL2 IP for Redis connection (Windows -> WSL2 networking)
const connection = {
  host: process.env.REDIS_HOST || '172.26.168.165',
  port: process.env.REDIS_PORT || 6379,
};

async function testQueue() {
  const queue = new Queue('test-queue', { connection });
  
  console.log('✓ Queue created');
  
  // Add a job
  await queue.add('test-job', { foo: 'bar' });
  console.log('✓ Job added to queue');
  
  // Get queue info
  const jobs = await queue.getJobs();
  console.log(`✓ Queue has ${jobs.length} job(s)`);
  
  // Clean up
  await queue.close();
  console.log('✓ Queue closed');
  
  console.log('\n✅ Redis + BullMQ test PASSED');
  console.log(`Redis version: 7.0.15 (WSL2)`);
  console.log(`BullMQ version: 5.71.0`);
}

testQueue().catch(err => {
  console.error('❌ Test FAILED:', err.message);
  process.exit(1);
});
