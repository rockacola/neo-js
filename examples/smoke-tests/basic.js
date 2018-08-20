#!/usr/bin/env node

const Neo = require('../../dist/neo').Neo

// -- Implementation

;(async () => {
  console.log('== Basic Example ==')
  const neo = new Neo({
    network: 'testnet',
    meshOptions: {
      loggerOptions: { level: 'debug' },
    },
    loggerOptions: { level: 'debug' },
  })

  neo.mesh.nodes[0].getVersion()
    .then((res) => {
      console.log('res:', res)
    })
    .catch((err) => {
      console.log('err:', err)
    })
})()
