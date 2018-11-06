#!/usr/bin/env node

const _ = require('lodash')
const Neo = require('../../dist/neo').Neo

process.on('unhandledRejection', (reason, p) => {
  console.warn('Unhandled promise rejection. Reason:', reason)
})

// -- Parameters

const network = 'mainnet'
const dbConnectOnInit = true
const dbConnectionString = 'mongodb://localhost/neo_mainnet'
const blockCollectionName = 'blocks'

// -- Implementation

;(async () => {
  console.log('== Prune Example ==')
  const neo = new Neo({
    network: network,
    storageType: 'mongodb',
    storageOptions: {
      connectOnInit: dbConnectOnInit,
      connectionString: dbConnectionString,
      collectionNames: {
        blocks: blockCollectionName,
      },
      loggerOptions: { level: 'debug' },
    },
    meshOptions: {
      loggerOptions: { level: 'info' },
    },
    apiOptions: {
      loggerOptions: { level: 'info' },
    },
    syncerOptions: {
      startOnInit: false,
      loggerOptions: { level: 'info' },
    },
    loggerOptions: { level: 'info' },
  })

  neo.storage.on('ready', async () => {
    console.log('=> neo.storage ready.')

    await neo.storage.pruneBlock(517622, 1)

    neo.close()
    console.log('=== THE END ===')
  })
})()
