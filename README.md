mqtt-shepherd
========================

## Table of Contents

1. [Overiew](#Overiew)  
2. [Features](#Features)  
3. [Installation](#Installation)  
4. [Basic Usage](#Basic)  
5. [APIs and Events](#APIs)  
    * MqttShepherd Class
    * MqttNode Class
6. [Message Encryption](#Encryption)  
7. [Auth Policies](#Auth)  
8. [Example with websocket](#example)  

<a name="Overiew"></a>
## 1. Overview

The lightweight MQTT machine network ([**LWMQN**](https://simenkid.github.io/lwmqn)) is an architecture that follows part of [**LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

This module, **mqtt-shepherd**, is an implementation of LWMQN Server that can run on platfroms equipped with node.js.  

LWMQN Client and Server benefits from the IPSO data model, which leads to a very comprehensive way for the Server to use a *path* with URI-style to allocate and query Resources on Client Devices. In the following example, both of these two requests is to read the sensed value from a temperature sensor on a Client Device.  
  
```js
qnode.readReq('temperature/0/sensorValue', function (err, rsp) {
    console.log(rsp); // { status: 205, data: 18 }
});

qnode.readReq('3304/0/5700', function (err, rsp) {
    console.log(rsp); // { status: 205, data: 18 }
});
```
  
The goal of **mqtt-shepherd** is to let you build and manage an MQTT machine network with less efforts, it is implemented as a server-side application framework with many network management functions, e.g. permission of device joining, device authentication, reading, writing and observing resources on a remote device, remotely executing a procedure on the Device. Furthermore, thanks to the power of node.js, making your own RESTful APIs to interact with your machines is also possible.  
  
**Note**: This project is planning to provide a web-client library for front-end users in the near future.  

#### Acronym
* **Server**: LWMQN Server
* **Client** or **Client Device**: LWMQN Client 
* **MqttShepherd**: class exposed by `require('mqtt-shepherd')`  
* **MqttNode**: class to create a software endpoint of a remote Client Device on the Server
* **qserver**: instance of MqttShepherd Class 
* **qnode**: instance of MqttNode Class  
* **oid**: identifier of an Object  
* **iid**: identifier of an Object Instance  
* **rid**: indetifier of a Resource  

**Note**: IPSO uses _Object_, _Object Instance_ and _Resource_ to describe the hierarchical structure of resources on a Client Device. The Server can use oid, iid, and rid to allocate resources on a Client Device.  

<a name="Features"></a>
## 2. Features

* MQTT protocol
* Based on [Mosca](https://github.com/mcollina/mosca/wiki), an MQTT broker on node.js.  
* Hierarchical data model in Smart-Object-style (IPSO)  
* Easy to query resources on a Client Device  
* LWM2M-like interfaces for Client/Server interaction  
* Simple machine network managment  
  
<a name="Installation"></a>
## 3. Installation

> $ npm install mqtt-shepherd --save
  
<a name="Basic"></a>
## 4. Basic Usage

Server-side example:  

```js
var MqttShepherd = require('mqtt-shepherd');
var qserver = new MqttShepherd();

qserver.on('ready', function () {
    console.log('Server is ready.');
    qserver.permitJoin(180);    // open for devices to join the network within 180 secs
});

qserver.start(function (err) {  // start the sever
    if (err)
        console.log(err);
});

// That's all to start a LWMQN Server.
// Now the Server is going to auotmatically tackle most of the network managing things.
```
  
<a name="APIs"></a>
## 5. APIs and Events  
  
This moudle provides you with MqttShepherd and MqttNode classes.  

* The MqttShepherd class brings you a LWMQN Server with network managing facilities, i.e., start/stop the Server, permit device joining, find an joined node. This document uses `qserver` to denote the instance of this Server class.  

* The MqttNode is the class for creating a software endpoint which represents the remote Client Device at server-side. This document uses `qnode` to denote the instance of this Client class. You can invoke methods on a `qnode` to operate the remote Device.  

* MqttShepherd APIs  
    * [new MqttShepherd()](#API_MqttShepherd)  
    * [start()](#API_start)  
    * [stop()](#API_stop)  
    * [permitJoin()](#API_permitJoin)  
    * [(ok) info()](#API_info)  
    * [(ok) listDevices()](#API_listDevices)  
    * [find()](#API_find)  
    * [remove()](#API_remove)  
    * [announce()](#API_announce)  
    * [(OK) maintain()](#API_maintain)  
    * Events: [ready](#EVT_ready), [error](#EVT_error), [ind](#EVT_ind), and [message](#EVT_message)  

* MqttNode APIs (`qnode` denotes the instance of this class)  
    * [qnode.read()](#API_readReq)  
    * [qnode.write()](#API_writeReq)  
    * [qnode.writeAttrs()](#API_writeAttrsReq)  
    * [qnode.discover()](#API_discoverReq)  
    * [qnode.execute()](#API_executeReq)  
    * [qnode.observe()](#API_observeReq)  
    * [qnode.dump()](#API_dump)  
    
*************************************************

<br />

## MqttShepherd Class
Exposed by `require('mqtt-shepherd')`  
  
***********************************************

<br />

<a name="API_MqttShepherd"></a>
### new MqttShepherd([name][, settings])
Create a new instance of the `MqttShepherd` class.  
  
**Arguments:**  

1. `name` (_String_): Your server name. A default name `'mqtt_shepherd'` will be used if not given.  
2. `settings` (_Object_): Settings for the Mosca MQTT broker. If not given, the default settings will be applied, i.e. port 1883 for the broker, LevelUp for presistence. You can set up your backend, like mongoDB, Redis, Mosquitto, or RabbitMQ, through this option. Please refer to the [Mosca wiki page](https://github.com/mcollina/mosca/wiki/Mosca-advanced-usage) for details.  
    
**Returns:**  
  
* (_Object_): qserver

**Examples:**  

* Create a server and name it

```js
var MqttShepherd = require('mqtt-shepherd');
var qserver = new MqttShepherd('my_iot_server');
```

* Create a server that starts on a specified port

```js
var qserver = new MqttShepherd('my_iot_server', {
    port: 9000
});
```

* Create a server with other backend (example from Mosca wiki)

```js
var qserver = new MqttShepherd('my_iot_server', {
    port: 1883,
    backend: {
        type: 'mongo',        
        url: 'mongodb://localhost:27017/mqtt',
        pubsubCollection: 'ascoltatori',
        mongo: {}
    }
});
```

*************************************************

<a name="API_start"></a>
### .start([callback])
Start the qserver.  

**Arguments:**  

1. `callback` (_Function_): Get called after the initializing procedure is done.  

  
**Returns:**  
  
* _promise_

**Examples:**  
    
```js
qserver.start(function () {
    console.log('server initialized.');
});
```

*************************************************

<a name="API_stop"></a>
### .stop([callback])
Stop the qserver.  

**Arguments:**  

1. `callback` (_Function_): Get called after the server closed.  

  
**Returns:**  
  
* _promise_

**Examples:**  
    
```js
qserver.stop(function () {
    console.log('server stopped.');
});
```

*************************************************

<a name="API_permitJoin"></a>
### .permitJoin(time)
Open for devices to join the network.  

**Arguments:**  

1. `time` (_Number_): Time in seconds for qsever allowing devices to join the network. Set `time` to `0` can immediately close the admission.  
  
**Returns:**  
  
* (_Object_): qserver

**Examples:**  
    
```js
qserver.permitJoin(180); // permit devices to join for 180 seconds 
```

*************************************************

<a name="API_info"></a>
### .info()
Returns the qserver infomation.

**Arguments:**  

1. none  
  
**Returns:**  
  
* (_Object_): An object that contains the information about the Server. Fields in this object are shown in the following table.  

| Property     | Type    | Description                                   |
|--------------|---------|-----------------------------------------------|
| name         | String  | Server name                                   |
| enabled      | Boolean | Server is up(true) or down(false)             |
| intf         | String  | Network interface, i.e. `'eth0'`              |
| type         | String  | Network type, i.e. `'Wired'`                  |
| ip           | String  | Server ip address                             |
| mac          | String  | Server mac address                            |
| routerIp     | String  | Router IP address                             |
| devNum       | Number  | Number of devices joined the network          |
| permitJoin   | Boolean | Indicates if the Server allows for joining    |
| startTime    | Number  | Unix Time (secs)                              |

**Examples:**  
    
```js
console.log(qserver.info());

{
    name: 'my_iot_server',
    ip: '192.168.1.99',
    mac: '00:0c:29:6b:fe:e7',
    routerIp: '192.168.1.1',
    manuf: 'sivann',
    devNum: 36,
    status: 'online',
    permitJoin: false,
    startTime: 1454419506
}  
```

*************************************************
<a name="API_listDevices"></a>
### .listDevices([clientIds])
List all records of the registered Client Devices.  

**Arguments:**  

1. `clientIds` (_Array_): It is an array of client ids to query. All device records will be returned if `clientIds` is not given.

  
**Returns:**  
  
* (_Array_): Information of all the Client Devices. Each record in the array is an object with the properties shown in the following table. The entry in the array will be `undefined` if that Client Device is not found. 

| Property     | Type    | Description                          |
|--------------|---------|--------------------------------------|
| clientId     | String  | Client id of the device              |
| ip           | String  | Ip address of the server             |
| mac          | String  | Mac address                          |
| status       | String  | `online`, `offline`                  |
| lifetime     | Number  | Lifetime of the device               |
| version      | String  | LWMQN version                        |
| joinTime     | Number  | Unix Time (secs)                     |
| objList      | Object  | IPSO Objects and Object Instances. Each key in `objList` is the `oid` and each value is an array of `iid` under that `oid`.     |


**Examples:**  
    
```js
console.log(qserver.listDevices([ 'foo_id', 'bar_id', 'no_such_id' ]));
[
    {
        clientId: 'foo_id',
        ip: 'xxx',
        mac: 'xxx',
        status: 'online',
        lifetime: 12345,
        version: '',
        joinTime: xxxx,
        objList: {
            3: [ 1, 2, 3 ],
            2205: [ 7, 5503 ]
        }
    },
    {
        clientId: 'bar_id',
        ip: 'xxx',
        mac: 'xxx',
        status: 'online',
        lifetime: 12345,
        version: '',
        joinTime: xxxx,
        objList: {
            3: [ 1, 2, 3 ],
            2205: [ 7, 5503 ]
        }
    },
    undefined
]
```

*************************************************
<a name="API_find"></a>
### .find(clientId)
Find the Client Device (qnode) on the qserver.

**Arguments:**  

1. `clientId` (_String_): Client id of the device to find.   

  
**Returns:**  
  
* (_Object_): qnode. Returns `undefined` if not found.

**Examples:**  
    
```js
var qnode = qserver.find('foo_id');

if (qnode) {
    // do what you wanna do upon the qnode, like qnode.read()
}
```

*************************************************

<a name="API_remove"></a>
### .remove(clientId[, callback])
Deregister and remove the Client Device (qnode) from the server.

**Arguments:**  

1. `clientId` (_String_): Client id of the node to be removed.  
2. `callback` (_Function_): `function (err, clientId) { ... }` will be called after node removal. `clientId` is id of the removed node.  
  
**Returns:**  
  
* _promise_

**Examples:**  
    
```js
qserver.remove('foo', function (err, clientId) {
    if (!err)
        console.log(clientId);
});
```

*************************************************

<a name="API_announce"></a>
### .announce(msg[, callback])
The Server can use this method to announce any message through the **announce channel**.  

**Arguments:**  

1. `msg` (_String_ | _Buffer_): The message to announce.  
2. `callback` (_Function_): `function (err) { ... }`. Get called after message announced.  
  
**Returns:**  
  
* _promise_

**Examples:**  
    
```js
qserver.announce('Rock on!');
```

*************************************************
<a name="API_maintain"></a>
### .maintain([clientIds,][callback])
Maintains the network. This will refresh all Client Device records on qserver by rediscovering each remote device. Only the specified Client Device records will be refresh if calling with an array of`clientIds`.  

**Arguments:**  

1. `clientIds` (_Array_): Client id of the devices to be refreshed.  
2. `callback` (_Function_): `function (err, clientIds) { ... }`. Get called after the maintenance finished. The `clientIds` is an array indicates the Client Devices that are successfully refreshed. The entry will be `undefined` for a Client Device if there were something going wrong, e.g. Device not found.  

  
**Returns:**  
  
* _promise_

**Examples:**  
    
```js
qserver.maintain(function (err, clientIds) {
    console.log(clientIds);
    // [ 'foo', 'bar', undefined, 'oof', 'rab', ... ]
});

server.maintain([ 'foo_id', 'no_such_id' ], function (err, clientIds) {
    console.log(clientIds);
    // [ 'foo_id',  undefined ]
});
```

*************************************************

<a name="EVT_ready"></a>
### Event: 'ready'
`function () { }`
Fired when Server is ready.  

*************************************************

<a name="EVT_error"></a>
### Event: 'error'
`function (err) { }`
Fired when there is an error occurred.  

*************************************************

<a name="EVT_ind"></a>
### Event: 'ind'
`function (type, msg) { }`
Fired when there is an incoming indication message. There are 5 kinds of indication `type` including `'devIncoming'`, `'devLeaving'`, `'devUpdate'`, `'devNotify'` and `'devChange'`.  

* ##### devIncoming    
    When there is a Client Device incoming to the network, qserver will fire an `'ind'` event along with this type of indication. The Client Device can be a new registered one or an old Device signing in.  

    * type: `'devIncoming'`
    * msg (_Object_): a qnode
<br />

* ##### devLeaving  
    When there is a Client Device leaving the network, qserver will fire an `'ind'` event along with this type of indication.  

    * type: `'devLeaving'`
    * msg (_String_): the clientId of which Device is leaving
<br />

* ##### 'devUpdate'
    When there is a Client Device leaving the network, qserver will fire an `'ind'` event along this type of indication.  

    * type: `'devLeaving'`
    * msg (_Object_): the updated device attributes, there may be fields of `status`, `lifetime`, `ip`, `version` in this object.
<br />

        ```js
        // example
        {
            status: 'online',
            ip: '192.168.0.36'
        }
        ```

* ##### 'devNotify'
    msg (_Object_): the notification from the Client Device. This object has fileds of `oid`, `iid`, `rid`, and `data`.  
    If `rid` is _`null`_ or _`undefined`_, the `data` is an Object Instance.
    If `rid` is valid, the `data` is an Resource and the data type depends on the Resource. 

        ```js
        // example of a Resource notification
        {
            oid: 'humidity',
            iid: 0,
            rid: 'sensorValue',
            data: 32
        }

        // example of an Object Instance notification
        {
            oid: 'humidity',
            iid: 0,
            data: {
                sensorValue: 32
            }
        }
        ```

* ##### 'devChange'
    msg (_Object_): the changes of a Resource or an Object Instance on the Client Device. This object has fileds of `oid`, `iid`, `rid`, and `data`.  
    If `rid` is _`null`_ or _`undefined`_, the `data` is an object that contains only the properties changed in an Object Instance. This can be thought of multi-Resource changes.  
    If `rid` is valid, the `data` is the new value of a Resource. If a Resource itself is an object, then `data` will be an object that contains only the properties changed in that Resource.  

    The diffrence between `'devChange'` and `'devNotify'` is that the message of `'devNotify'` is the data whatever a Client Device like to notify even if there are no changes of it. A periodical notification is a good example, the Client Device has to report something under observation even there are no changes of that thing. If there is really something changed, the Server will then fire `'devChange'` to report it.  

        ```js
        // changes of an Object Instance
        {
            oid: 'temperature',
            iid: 0,
            data: {
                sensorValue: 12,
                minMeaValue: 12
            }
        }

        // change of a Resource 
        {
            oid: 'temperature',
            iid: 1,
            rid: 'sensorValue',
            data: 18
        }
        ```

*************************************************

<a name="EVT_message"></a>
### Event: 'message'
`function(topic, message, packet) {}`  
Emitted when the Server receives a published packet from all channels  

1. `topic` (_String_): topic of the received packet  
2. `message` (_Buffer_): payload of the received packet  
3. `packet` (_Object_): the received packet, as defined in [mqtt-packet](#https://github.com/mqttjs/mqtt-packet#publish)  


***********************************************
<br />

## MqttNode Class
This class provides you with methods to perform remote operations upon a registered Client Device. Such an instance of this class is denoted as `qnode` in this document.  

***********************************************

<br />

<a name="API_readReq"></a>
### qnode.readReq(path, callback)
Remotely read the target on Client Device. Response will be passed through the callback.  

**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance, or Resource on the remote Client Device.  
2. `callback` (_Function_): `function (err, rsp) { }`
    `err` (_Object_): error object
    `rsp` (_Object_): The response is an object that has the status code along with the returned data from the remote Client Device.  

| Property | Type    | Description                                                             |
|----------|---------|-------------------------------------------------------------------------|
|  status  | Number  | Status code of the response. See [Status Code](#).                      |
|  data    | Depends | `data` can be the value of an Object, an Object Instance, or a Resource. Note that when an unreadable Resource is read, the returned value will be a string `'_unreadble_'`. |
  

**Returns:**  
  
* _none_

**Examples:**  
    
```js
qnode.readReq('temperature/1/sensedValue', function (err, rsp) {
    console.log(rsp);       // { status: 205, data: 87 }
});

// Target not found
qnode.readReq('/noSuchObject/0/foo', function (err, rsp) {
    console.log(rsp);       // { status: 404, data: undefined }
});

// Target not found
qnode.readReq('/temperature/0/noSuchResource/', function (err, rsp) {
    console.log(rsp);       // { status: 404, data: undefined }
});
```

***********************************************

<a name="API_writeReq"></a>
### qnode.writeReq(path, val[, callback])
Remotely write a value to the allocated Resource on the Client Device. The response will be passed through the callback.  

**Arguments:**  

1. `path` (_String_): Path of the allocated Resource on the remote Client Device.  
2. `val` (_Depends_): The value to write to the Resource.  
3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object that has a status code along with the written data from the remote Client Device.  
    | Property | Type    | Description                                                             |
    |----------|---------|-------------------------------------------------------------------------|
    |  status  | Number  | Status code of the response. See [Status Code](#).                      |
    |  data    | Depends | `data` is the written value. It will be a string `'_unwritable_'` if the Resource is not allowed for writing.|

**Returns:**  
  
* _none_

**Examples:**  
    
```js
// write successfully
qnode.writeReq('digitalOutput/0/appType', 'lightning', function (err, rsp) {
    console.log(rsp);   // { status: 204, data: 'lightning' }
});

qnode.writeReq('digitalOutput/0/dOutState', 0, function (err, rsp) {
    console.log(rsp);   // { status: 204, data: 0 }
});

// target not found
qnode.writeReq('temperature/0/noSuchResource', 1, function (err, rsp) {
    console.log(rsp);   // { status: 404, data: undefined }
});

// target is unwritable
qnode.writeReq('digitalInput/1/dInState', 1, function (err, rsp) {
    console.log(rsp);   // { status: 405, data: '_unwritable_' }
});
```

***********************************************

<a name="API_writeAttrsReq"></a>
### qnode.writeAttrsReq(path, attrs[, callback])
Configure the report settings of a Resource, an Object Instance, or an Object. This method can also used to cancel the observation by assgin the `cancel` property to `true` within `attrs` object.  
    
**Note**: This API won't start the report of notifications, call observe() method if you want to turn on reporting.  

**Arguments:**  

1. `path` (_String_): Path of the allocated Resource, Object Instance, or Object on the remote Client Device.  
2. `attrs` (_Object_): Parameters of report settings.  

    | Property | Type    | Mandatory | Description |
    |----------|---------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | pmin     | Number  | optional  | Minimum Period. Minimum time in seconds the Client Device should wait from the time when sending the last notification to the time when sending a new notification.                                     |
    | pmax     | Number  | optional  | Maximum Period. Maximum time in seconds the Client Device should wait from the time when sending the last notification to the time sending the next notification (regardless if the value has changed). |
    | gt       | Number  | optional  | Greater Than. The Client Device should notify its value when the value is greater than this setting. Only valid for the Resource typed as a number.                                                     |
    | lt       | Number  | optional  | Less Than. The Client Device should notify its value when the value is smaller than this setting. Only valid for the Resource typed as a number.                                                        |
    | stp      | Number  | optional  | Step. The Client Device should notify its value when the change of the Resource value, since the last report happened, is greater than this setting.                                                    |
    | cancel   | Boolean | optional  | It is set to `true` for the Client Device to cancel observation on the allocated Resource or Object Instance.                                                                                           |

3. `callback` (_Function_):  `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    | Property | Type    | Description                                                             |
    |----------|---------|-------------------------------------------------------------------------|
    |  status  | Number  | Status code of the response. See [Status Code](#).                      |

  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
// set successfully
qnode.writeAttributes('temperature/0/sensedValue', {
    pmin: 10,
    pmax: 600,
    gt: 45
}, function (err, rsp) {
    console.log(rsp);       // { status: 200 }
});

// taget not found
qnode.writeAttributes('temperature/0/noSuchResource', {
    gt: 20
}, function (err, rsp) {
    console.log(rsp);       // { status: 404 }
});

// parameter cannot be recognized
qnode.writeAttributes('temperature/0/noSuchResource', {
    foo: 60
}, function (err, rsp) {
    console.log(rsp);       // { status: 400 }
});
```

***********************************************

<a name="API_discoverReq"></a>
### qnode.discoverReq(path, callback)
Discover report settings of a Resource or, an Object Instance ,or an Object on the Client Device.  

**Arguments:**  

1. `path` (_String_):  Path of the allocated Resource, Object Instance, or Object on the remote Client Device.
2. `callback` (_Function_):   `function (err, rsp) { }`. The `rsp` object has a status code along with the parameters of report settings.  

    | Property | Type    | Description                                                                                                                          |
    |----------|---------|--------------------------------------------------------------------------------------------------------------------------------------|
    |  status  | Number  | Status code of the response. See [Status Code](#).                                                                                   |
    |  data    | Object  | `data` is an object contains the report settings. If the discoved target is an Object, there will be an field `data.resrcList` to list all its Resource idetifiers in each Object Instance. |
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
// discover a Resource successfully
qnode.discoverReq('temperature/0/sensedValue', function (err, rsp) {
    console.log(rsp);   // { status: 205, data: { pmin: 10, pmax: 600, gt: 45 }
});

// discover an Object successfully
qnode.discoverReq('temperature/', function (err, rsp) {
    console.log(rsp);   // {
                        //   status: 205,
                        //   data: {
                        //      pmin: 10,
                        //      pmax: 600,
                        //      gt: 45,
                        //      resrcList: {
                        //          0: [ 1, 3, 88 ],    // Instance 0 has Resources 1, 3, and 88
                        //          1: [ 1, 2, 6 ]      // Instance 1 has Resources 1, 2, and 6
                        //      }
                        //   }
                        // }
});
```

***********************************************
<a name="API_executeReq"></a>
### qnode.executeReq(path[, args][, callback])
Invoke an excutable Resource on the Client Device.  

**Arguments:**  

1. `path` (_String_): Path of the allocated Resource on the remote Client Device.  
2. `args` (_Array_): The arguments to the procedure.  
3. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful. There will be a `data` field if the procedure does return something back. The `data` type depends on the implementation at Client-side.  

    | Property | Type    | Description                                                             |
    |----------|---------|-------------------------------------------------------------------------|
    |  status  | Number  | Status code of the response. See [Status Code](#).                      |
    |  data    | Depends | What will be returned depends on the Client-side implementation.        |

  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
// assume there in an executable Resource (procedure) with singnatue
// function(n) { ... } to blink an LED n times.
qnode.execReq('led/0/blink', [ 10 ] ,function (err, rsp) {
    console.log(rsp);       // { status: 204 }
});

// assume there in an executable Resource with singnatue
// function(edge, duration) { ... } to counts how many times the button 
// was pressed in `duration` seconds.
qnode.execReq('button/0/blink', [ 'falling', 20 ] ,function (err, rsp) {
    console.log(rsp);       // { status: 204, data: 71 }
});

// Something went wrong at Client-side
qnode.execReq('button/0/blink', [ 'falling', 20 ] ,function (err, rsp) {
    console.log(rsp);       // { status: 500 }
});

// arguments cannot be recognized, in this example, 'up' is an invalid parameter
qnode.execReq('button/0/blink', [ 'up', 20 ] ,function (err, rsp) {
    console.log(rsp);       // { status: 400 }
});

// Resource not found
qnode.execReq('temperature/0/noSuchResource', function (err, rsp) {
    console.log(rsp);       // { status: 404 }
});

// invoke an unexecutable Resource
qnode.execReq('temperature/0/sensedValue', function (err, rsp) {
    console.log(rsp);       // { status: 405 }
});
```

***********************************************
<a name="API_observeReq"></a>
### qnode.observeReq(path[, callback])
Start observing a Resource on the Client Device.  

**Arguments:**  

1. `path` (_String_): Path of the allocated Resource on the remote Client Device.  
2. `callback` (_Function_): `function (err, rsp) { }`. The `rsp` object has a status code to indicate whether the operation is successful.  

    | Property | Type    | Description                                                             |
    |----------|---------|-------------------------------------------------------------------------|
    |  status  | Number  | Status code of the response. See [Status Code](#).                      |

  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
// observation starts successfully
qnode.observeReq('temperature/0/sensedValue', function (err, rsp) {
    console.log(rsp);       // { status: 205 }
});

// An Object is not allowed for observation
qnode.observeReq('temperature/', function (err, rsp) {
    console.log(rsp);       // { status: 400 }
});

// target is not allowed for observation
qnode.observeReq('temperature/0', function (err, rsp) {
    console.log(rsp);       // { status: 405 }
});

// target not found
qnode.observeReq('temperature/0/noSuchResource', function (err, rsp) {
    console.log(rsp);       // { status: 404 }
});
```

***********************************************

<a name="API_dump"></a>
### qnode.dump()
Dump the record of the Client Device.

**Arguments:**  

1. none  
  
**Returns:**  
  
* (_Object_): A data object of qnode record.

| Property         | Type    | Description                          |
|------------------|---------|--------------------------------------|
|  clientId        | String  | Client id of the device              |
|  ip              | String  | Ip address of the server             |
|  mac             | String  | Mac address                          |
|  lifetime        | Number  | Lifetime of the device               |
|  version         | String  | LWMQN version                        |
|  joinTime        | Number  | Unix Time (secs)                     |
|  objList         | Object  | Resource ids of each Object          |
|  so              | Object  | Contains IPSO Object(s)              |

**Examples:**  
    
```js
console.log(qnode.dump());

/* 
{
    clientId: 'foo_id',
    ip: '192.168.1.114',
    mac: '9e:65:f9:0b:24:b8',
    lifetime: 86400,
    version: 'v0.0.1',
    joinTime: 1460448761,
    objList: {
        '1': [ 0 ],
        '3': [ 0 ],
        '4': [ 0 ],
        '3303': [ 0, 1 ],
        '3304': [ 0 ]
    },
    so: {
        lwm2mServer: {  // oid is 'lwm2mServer' (1)
            '0': {
                shortServerId: null,
                lifetime: 86400,
                defaultMinPeriod: 1,
                defaultMaxPeriod: 60,
                regUpdateTrigger: '_unreadable_'
            }
        },
        device: {       // oid is 'device' (3)
            '0': {
                manuf: 'LWMQN_Project',
                model: 'dragonball',
                reboot: '_unreadable_',
                availPwrSrc: 0,
                pwrSrcVoltage: 5,
                devType: 'Env Monitor',
                hwVer: 'v0.0.1',
                swVer: 'v0.2.1'
            }
        },
        connMonitor: {  // oid is 'connMonitor' (4)
            '0': {
                ip: '192.168.1.114',
                routeIp: ''
            }
        },
        temperature: {              // oid is 'temperature' (3303)
            0: {                    //   iid = 0
                sensedValue: 18,    //     rid = 'sensedValue', its value is 18
                appType: 'home'     //     rid = 'appType', its value is 'home'
            },
            1: {
                sensedValue: 37,
                appType: 'fireplace'
            }
        },
        humidity: {                 // oid is 'humidity' (3304)
            0: {
                sensedValue: 26,
                appType: 'home'
            }
        }
    }
}
*/
```

***********************************************

<br />

<a name="Encryption"></a>
## 6. Message Encryption

By default, the Server won't encrypt the message. You can override the encrypt() and decrypt() methods to implement your own message encryption and decryption. If you did, you should implement the encrypt() and decrypt() methods at your Client Devices as well.  

* [qserver.encrypt(msg, clientId, callback)](#method_encrypt)
    - `msg` is a string or a buffer.  
    - `clientId` is the Client that this message going to.  
    - `callback(err, encrypted)` is the callback you should call and pass the encrypted message to it after encryption.  

* [qserver.decrypt(msg, clientId)](#method_decrypt)
    - `msg` is a received buffer.  
    - `clientId` is the Client that this message coming from.  
    - `callback(err, decrypted)` is the callback you should call and pass the decrypted message to it after decryption.  

**Examples:**  

```js
var qserver = new MqttShepherd('my_iot_server');

// In this example, I simply encrypt the message with a constant password 'mysecrete'
// You may like to get the password according to different Clients by `clientId`

qserver.encrypt = function (msg, clientId, callback) {
    var msgBuf = new Buffer(msg),
        cipher = crypto.createCipher('aes128', 'mysecrete'),
        encrypted = cipher.update(msgBuf, 'binary', 'base64');

    try {
        encrypted += cipher.final('base64');
        callback(null, encrypted);
    } catch (e) {
        callback(e);
    }
};

qserver.decrypt = function (msg, clientId, callback) {
    msg = msg.toString();
    var decipher = crypto.createDecipher('aes128', 'mysecrete'),
        decrypted = decipher.update(msg, 'base64', 'utf8');

    try {
        decrypted += decipher.final('utf8');
        callback(null, decrypted);
    } catch (e) {
        callback(e);
    }
};
```

***********************************************
<br />

<a name="Auth"></a>
## 7. Authentication and Authorization Policies

[TBD]  

* [qserver.authPolicy.authenticate(client, user, pass, cb)](#method_encrypt)
    - `client` is a string or a buffer.  
    - `user` is the Client that this message going to.  
    - `pass` is the Client that this message going to.  
    - `cb(err, authorized)` is the callback you should call and pass the encrypted message to it after encryption.  

* [qserver.authPolicy.authorizePublish(client, topic, payload, cb)](#method_decrypt)
    - `client` is a string or a buffer.  
    - `topic` is the Client that this message going to.  
    - `payload` is the Client that this message going to.  
    - `cb(err, authorized)` is the callback you should call and pass the encrypted message to it after encryption.  

* [qserver.authPolicy.authorizeSubscribe(client, topic, cb)](#method_decrypt)
    - `client` is a string or a buffer.  
    - `topic` is the Client that this message going to.  
    - `cb(err, authorized)` is the callback you should call and pass the encrypted message to it after encryption.  

* [qserver.authPolicy.authorizeForward(client, packet, cb)](#method_decrypt)
    - `client` is a string or a buffer.  
    - `packet` is the Client that this message going to.  
    - `cb(err, authorized)` is the callback you should call and pass the encrypted message to it after encryption.  


***********************************************
<br />

<a name="example"></a>
## 8. Example with websocket

[TBD] Demonstrate how to build GUI using socket.io
