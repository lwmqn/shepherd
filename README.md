![LWMQN Network](https://raw.githubusercontent.com/lwmqn/documents/master/media/lwmqn_net.png)

<div align="center">

**mqtt-shepherd** is a network server and manager for the lightweight MQTT machine network (LWMQN)
  
[![Greenkeeper badge](https://badges.greenkeeper.io/lwmqn/mqtt-shepherd.svg?style=flat-square)](https://greenkeeper.io/)
[![NPM version](https://img.shields.io/npm/v/mqtt-shepherd.svg?style=flat-square)](https://www.npmjs.com/package/mqtt-shepherd)
[![NPM downloads](https://img.shields.io/npm/dm/mqtt-shepherd.svg?style=flat-square)](https://www.npmjs.com/package/mqtt-shepherd)
[![Travis branch](https://img.shields.io/travis/lwmqn/mqtt-shepherd/master.svg?maxAge=2592000&style=flat-square)](https://travis-ci.org/lwmqn/mqtt-shepherd)
[![Coverage Status](https://coveralls.io/repos/github/lwmqn/mqtt-shepherd/badge.svg?branch=master&style=flat-square)](https://coveralls.io/github/lwmqn/mqtt-shepherd?branch=master)
[![Gitter](https://img.shields.io/gitter/room/lwmqn/Lobby.svg?style=flat-square)](https://gitter.im/lwmqn/Lobby) 
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
![pr-welcoming-image](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)

</div>

-------

## What is LWMQN

Lightweight MQTT machine network ([**LWMQN**](http://lwmqn.github.io)) is an open source project that follows part of [**OMA LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

### Server-side and Client-side Libraries:
   - LWMQN project provides you with this machine-side **mqtt-node** library and a server-side [**mqtt-shepherd**](https://github.com/lwmqn/mqtt-shepherd) library to build your machine network with JavaScript and node.js easily. 

* Server-side library: **mqtt-shepherd** (this module)
* Client-side library: [**mqtt-node**](https://github.com/lwmqn/mqtt-node)
* [**A simple demo webapp**](https://github.com/lwmqn/lwmqn-demo)

### Features

* Communication based on MQTT protocol and [Mosca](https://github.com/mcollina/mosca/wiki) broker.
* Embedded persistence ([NeDB](https://github.com/louischatriot/nedb)) and auto-reloads Client Devices at boot-up.
* Build your IoT network with or without cloud services.
* LWM2M-like interfaces for Client/Server interaction.
* Hierarchical Smart Object data model ([IPSO](http://www.ipso-alliance.org/)), which leads to a comprehensive and consistent way in describing real-world gadgets.
* Easy to query resources on a Client Device with the URI-style path, and everything has been well-organized to ease the pain for you to create RPC interfaces for your webapps, such as RESTful and websocket-based APIs.
* LWMQN Server is your local machine gateway and application runner. But if you like to let your machines go up cloud, why not? It's node.js!

#### Acronyms and Abbreviations
* **Server**: LWMQN server
* **Client** or **Client Device**: LWMQN client (machine)
* **MqttShepherd**: Class exposed by `require('mqtt-shepherd')`  
* **MqttNode**: Class to create a software endpoint(proxy) of a remote Client Device on the server
* **qserver**: Instance of MqttShepherd Class 
* **qnode**: Instance of MqttNode Class  

-------

## Installation

Currently [Node.js 8.x LTS](https://nodejs.org/en/about/releases/) or higher is required.

```bash
$ npm install mqtt-shepherd
```

-------

## Basic Usage

```js
var MqttShepherd = require('mqtt-shepherd');
var qserver = new MqttShepherd();   // create a LWMQN server

qserver.on('ready', function () {
    console.log('Server is ready.');

    // when server is ready, allow devices to join the network within 180 secs
    qserver.permitJoin(180);
});

qserver.start(function (err) {      // start the sever
    if (err)
        console.log(err);
});

// That's all to start a LWMQN server.
// Now qserver is going to automatically tackle most of the network managing things.
```


-------

## Documentation
* <a href="https://github.com/lwmqn/mqtt-shepherd/blob/master/docs/Basic-APIs.md"><code><b>Basic APIs</b></code></a>
* <a href="https://github.com/lwmqn/mqtt-shepherd/blob/master/docs/Events.md"><code><b>Events</b></code></a>
* <a href="https://github.com/lwmqn/mqtt-shepherd/blob/master/docs/Message-Encryption.md"><code><b>Message Encryption</b></code></a>
* <a href="https://github.com/lwmqn/mqtt-shepherd/blob/master/docs/Auth-Policies.md"><code><b>Auth Policies</b></code></a>
* <a href="https://github.com/lwmqn/mqtt-shepherd/blob/master/docs/Status-Codes.md"><code><b>Status Codes</b></code></a>
* <a href="https://github.com/lwmqn/mqtt-shepherd/blob/master/docs/Debug-Messages.md"><code><b>Debug Messages</b></code></a>

-------

## License

Licensed under [MIT](https://github.com/lwmqn/mqtt-shepherd/blob/master/LICENSE).

