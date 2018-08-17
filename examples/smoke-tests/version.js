#!/usr/bin/env node

const Neo = require('../../dist/index.js').default

// -- Implementation

;(async () => {
  console.log('== Get Version Example ==')
  console.log('Neo class Version:', Neo.VERSION)
  const neo = new Neo()
  console.log('Neo instance Version:', neo.VERSION)
})()
