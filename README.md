<p align="center">
  <img 
    src="http://res.cloudinary.com/vidsy/image/upload/v1503160820/CoZ_Icon_DARKBLUE_200x178px_oq0gxm.png" 
    width="125px"
    alt="City of Zion logo">
</p>

<p align="center" style="font-size: 32px;">
  <strong>neo-js</strong>
</p>

<p align="center">
  Running NEO blockchain full node with Node.js and MongoDB.
</p>

<p align="center">
  <a href="https://badge.fury.io/js/%40cityofzion%2Fneo-js">
    <img src="https://badge.fury.io/js/%40cityofzion%2Fneo-js.svg" alt="npm version">
  </a>
</p>

## Overview

`neo-js` package is designed to interface with the NEO blockchain in a number of different ways that are configured by options that are used to initialize a node. A few examples of these different interaction mechanics are defined in the quickstart below as well as in the examples.

**This is not a SDK library for interacting with NEO blockchain. You are looking for [`neon-js`](https://github.com/cityofzion/neon-js).**

## Getting Started

### Preparations

Currently this module only support MongoDB for synchronizing the blockchain. You are expect to be connected to an
instance of MongoDB 3.2+ to use most of its features.

### System Recommendations

* NodeJS 8+
* MongoDB 3.2+

## Installation

Install the package using:

```bash
$ npm install --save @cityofzion/neo-js
```

Alternatively, to access to the latest available code, you can reference to the git repository directly:

```bash
$ npm install --save git://github.com/CityOfZion/neo-js.git#develop
```

## Quick Start

More comprehensive examples can be found at [`neo-js-examples`](https://github.com/rockacola/neo-js-examples) repository.

```js
const Neo = require('@cityofzion/neo-js').Neo
```

To create a new blockchain instance:

```js
// Create a neo instances to interface with RPC methods
const testnetNeo = new Neo({ network: 'testnet' })

// Wait for mesh to be ready before attempt to fetch block information
testnetNeo.mesh.on('ready', () => {
  testnetNeo.api.getBlockCount()
    .then((res) => {
      console.log('Testnet getBlockCount:', res)
    })
})

// To connect to the mainnet:
const mainnetNeo = new Neo({ network: 'mainnet' })

mainnetNeo.mesh.on('ready', () => {
  mainnetNeo.api.getBlock(1000)
    .then((res) => {
      console.log('Mainnet getBlock(1000).hash:', res.hash)
    })
})
```

This will create a new node instance and configure it to sync the blockchain to the defined mongoDB collections:

```js
const options = {
  network: 'testnet',
  storageType: 'mongodb',
  storageOptions: {
    connectionString: 'mongodb://localhost/neo_testnet',
  },
}

// Create a neo instance
const neo = new Neo(options)

// Get block count
neo.storage.on('ready', () => {
  neo.storage.getBlockCount()
    .then((res) => {
      console.log('Block count:', res)
    })
})
```

## Documentation

Documentation for the project can be found at:

* [http://cityofzion.io/neo-js/](http://cityofzion.io/neo-js/)

You can find more code examples at repository:

* [https://github.com/rockacola/neo-js-examples](https://github.com/rockacola/neo-js-examples)

## Blockchain Bootstrap Files

[_Please refer to Bootstrap Files document_](https://github.com/CityOfZion/neo-js/blob/master/BOOTSTRAP_FILES.md)

## Options

[_Please refer to Optional Parameters document_](https://github.com/CityOfZion/neo-js/blob/master/OPTIONAL_PARAMETERS.md)

## Events

[_Please refer to Event Emitters document_](https://github.com/CityOfZion/neo-js/blob/master/EVENT_EMITTERS.md)

## Contribution

`neo-js` always encourages community code contribution. Before contributing please read the [contributor guidelines](https://github.com/CityOfZion/neo-js/blob/master/.github/CONTRIBUTING.md) and search the issue tracker as your issue may have already been discussed or fixed. To contribute, fork `neo-js`, commit your changes and submit a pull request.

By contributing to `neo-js`, you agree that your contributions will be licensed under its MIT license.

## License

* Open-source [MIT](https://github.com/CityOfZion/neo-js/blob/master/LICENSE.md).
* Authors:
  * [@lllwvlvwlll](https://github.com/lllwvlvwlll)
  * [@rockacola](https://github.com/rockacola)
