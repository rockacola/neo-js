#!/usr/bin/env node

const moment = require('moment')
const Neo = require('../../dist/neo').Neo

process.on('unhandledRejection', (reason, p) => {
  console.warn('Unhandled Rejection at: Promise', p, 'reason:', reason)
})

// -- Parameters

const network = 'mainnet'
const dbConnectOnInit = true
const dbConnectionString = 'mongodb://localhost/neo_mainnet'
const blockCollectionName = 'blocks'
const syncDurationMs = 5 * 60 * 1000

// -- Implementation

;(async () => {
  console.log('== Syncer Example ==')
  const neo = new Neo({
    network: network,
    storageType: 'mongodb',
    storageOptions: {
      connectOnInit: dbConnectOnInit,
      connectionString: dbConnectionString,
      collectionNames: {
        blocks: blockCollectionName,
      },
      loggerOptions: { level: 'warn' },
    },
    meshOptions: {
      loggerOptions: { level: 'warn' },
    },
    syncerOptions: {
      loggerOptions: { level: 'warn' },
    },
    loggerOptions: { level: 'warn' },
  })


  // Fetch Info
  neo.mesh.on('ready', async () => {
    const chainBlockCount = await neo.mesh.getHighestNode().getBlockCount()
    console.log('Highest Block Count:', chainBlockCount)
    const storageBlockCount = await neo.storage.getBlockCount()
    console.log('Highest Count in Storage:', storageBlockCount)
  })

  // Live Report
  const report = {
    success: [],
    failed: [],
    max: undefined,
    startDate: moment()
  }
  neo.syncer.on('storeBlock:complete', (payload) => {
    // console.log('syncer storeBlock complete triggered. payload:', payload)
    if (payload.isSuccess) {
      report.success.push({
        height: payload.height,
        date: moment(),
      })
    } else {
      report.failed.push({
        height: payload.height,
        date: moment(),
      })
    }
  })
  const reportIntervalId = setInterval(() => { // Generate report periodically
    if (report.success.length > 0) {
      report.max = neo.mesh.getHighestNode().blockHeight
      const msElapsed = moment().diff(report.startDate)
      const successBlockCount = report.success.length
      const highestBlock = report.success[report.success.length - 1].height // This is an guesstimate
      const completionPercentage = Number((highestBlock / report.max * 100).toFixed(4))
      const blockCountPerMinute = Number((successBlockCount / msElapsed * 1000 * 60).toFixed(0))
      console.log(`Blocks synced: ${successBlockCount} (${completionPercentage}% complete) - ${blockCountPerMinute} blocks/minute`)
    } else {
      console.log('No sync progress yet...')
    }
  }, 5000)

  if (syncDurationMs) {
    console.log(`Sync process with stop after ${syncDurationMs} ms...`)
    setTimeout(() => {
      neo.close()
      clearInterval(reportIntervalId)
      console.log('=== THE END ===')
    }, syncDurationMs)
  }
})()
