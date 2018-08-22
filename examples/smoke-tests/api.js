#!/usr/bin/env node

const Neo = require('../../dist/neo').Neo

process.on('unhandledRejection', (reason, p) => {
  console.warn('Unhandled Rejection at: Promise', p, 'reason:', reason)
})

// -- Implementation

;(async () => {
  console.log('== API Example ==')
  const neo = new Neo({
    network: 'testnet',
    meshOptions: {
      loggerOptions: { level: 'debug' },
    },
    apiOptions: {
      loggerOptions: { level: 'debug' },
    },
    loggerOptions: { level: 'debug' },
  })

  // Wait for mesh to be ready before start testing
  neo.mesh.on('ready', async () => {
    const blockCount = await neo.api.getBlockCount()
    console.log('=> blockCount:', blockCount)

    neo.mesh.stopBenchmark()
    console.log('=== THE END ===')
  })
})()
