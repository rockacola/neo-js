const profiles = {
  version: '0.10.0',
  rpc: {
    mainnet: [
      { endpoint: 'https://seed1.neo.org:10331' },
      { endpoint: 'http://seed2.neo.org:10332' },
      { endpoint: 'http://seed3.neo.org:10332' },
      { endpoint: 'http://seed4.neo.org:10332' },
      { endpoint: 'http://seed5.neo.org:10332' },
    ],
    testnet: [
      { endpoint: 'https://seed1.neo.org:20331' },
      { endpoint: 'http://seed2.neo.org:20332' },
      { endpoint: 'http://seed3.neo.org:20332' },
      { endpoint: 'http://seed4.neo.org:20332' },
      { endpoint: 'http://seed5.neo.org:20332' },
    ],
  },
}

export default profiles
