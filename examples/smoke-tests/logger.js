#!/usr/bin/env node

const Neo = require('../../dist/index.js').default

// -- Implementation

;(async () => {
  console.log('== Logger Example ==')
  const neo = new Neo()
  console.log('logger name:', neo.logger.getName())
})()
