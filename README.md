mqtt-shepherd
========================

## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Basic Usage](#Basic)
5. [APIs and Events](#APIs)
6. [Message Encryption](#Auth)
7. [Auth Policy](#Auth)
8. [Example with websocket](#example)

<a name="Overiew"></a>
## 1. Overview

The light-weight MQTT machine network ([**LWMQN**](https://www.www.com)) is an architecture that follows part of the [**LWM2M v1.0**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) specification to meet the minimum requirements of machine network management.  

[`mqtt-shepherd`](https://www.npmjs.com/package/mqtt-shepherd) is an implementation of the LWMQN Server and [`mqtt-node`](https://www.npmjs.com/package/mqtt-node) is an implementation of the LWMQN Client on node.js. They are working together into an IoT application framework. This server-side module `mqtt-shepherd` can run on platfroms equipped with node.js.  

The LWMQN Client and Server benefits from the IPSO object model. This leads to a very comprehensive way for the Server to use a *path* to allocate and query Resources from Client Devices. It's similar to URI style to identify a resource on a Server. For exmaple,  


```js
qnode.readReq('humidSensor/0/sensorValue', function (err, rsp) { ... });
qnode.readReq('3304/0/5700', function (err, rsp) { ... });
```

, both of these two requests is to read the sensed value from the Object Instance of a humidity sensor on a Client Device.
   
The goal of `mqtt-shepherd` is to let you build and manage an MQTT machine network with less efforts, e.g., permission of device joining, device authentication, reading and writing resources on a remote device, observing the changes of remote resources, remote execution of a procedure on the device. Furthermore, thanks to the power of node.js http server, making your own RESTful APIs to interact with your machines is also possible.
  
Note: This project is planning to privode a web-client library based on websocket for front-end users.

#### Acronym
* **Server**: the LWMQN Server
* **Client** or **Client Device**: the LWMQN Client 
* **MqttShepherd**: the class exposed by `require('mqtt-shepherd')`  
* **MqttNode**: the class to create a software endpoint of the remote Client Device on the Server
* **qserver**: the instance of the MqttShepherd
* **qnode**: the instance of the MqttNode  
* **oid**: identifier of an Object  
* **iid**: identifier of an Object Instance  
* **rid**: indetifier of a Resource  

Note: Object, Object Instance and Resource are used by the IPSO specification to describe the hierarchical structure of resources. The Server can use oid, iid and rid to  allocate the resource on a Client Device.  

<a name="Features"></a>
## 2. Features

* Based on the [Mosca](https://github.com/mcollina/mosca/wiki) which is an MQTT broker on node.js, and the [mqtt.js](https://www.npmjs.com/package/mqtt).
* Follows the IPSO definitions  
* Ea....
* LWM2M-like interfaces  
  
<a name="Installation"></a>
## 3. Installation

> $ npm install mqtt-shepherd --save
  
<a name="Basic"></a>
## 4. Basic Usage

Server-side example:  

```js
var MqttShepherd = require('mqtt-shepherd');
var server = new MqttShepherd();

server.on('ready', function () {
    console.log('Server is ready.');
});

server.permitJoin(180); // open for device joining in 180 secs
server.start(function (err) {
    if (err)
        console.log(err);
});

// That's all to start a LWMQN server.
// Now the server is going to auotmatically tackle most of the network managing things.
```
  
<a name="APIs"></a>
## 5. APIs

* Server APIs
    * [new MqttShepherd()](#API_MqttShepherd)
    * [start()](#API_start)
    * [stop()](#API_stop)
    * [(X) reset()](#API_reset)
    * [permitJoin()](#API_permitJoin)
    * [info()](#API_info)
    * [listDevices()](#API_listDevices)
    * [find()](#API_findNode)    
    * [remove()](#API_remove)
    * [announce()](#API_announce) 
    * [maintain()](#API_maintain)
    * Events: [ready](#), [error](#), [ind](#), and [message](#)  
<br />  

* MqttNode APIs
    * [qnode.dump()](#API_dump)
    * [qnode.read()](#API_readReq)
    * [qnode.write()](#API_writeReq)
    * [qnode.writeAttrs()](#API_writeAttrsReq)
    * [qnode.discover()](#API_discoverReq)
    * [qnode.execute()](#API_executeReq)
    * [qnode.observe()](#API_observeReq) 
    * [(X) qnode.maintain()](#API_observeReq)
    
*************************************************

## MqttShepherd Class
Exposed by `require('mqtt-shepherd')`  
  
<a name="API_MqttShepherd"></a>
### new MqttShepherd([name][, settings])
Create a new instance of the `MqttShepherd` class.  
  
**Arguments:**  

1. `name` (_String_): The name of your server. A default name will be used if it is not given.
2. `settings` (_Object_): This is the settings for the Mosca MQTT broker. If it is not given, the MqttShepherd will use port 1883 and LevelUp for presistence by default. 
    You can set up your backend, like mongoDB, Redis, Mosquitto or RabbitMQ, through this option. Please refer to the [Mosca wiki page](https://github.com/mcollina/mosca/wiki/Mosca-advanced-usage) for details.

    
**Returns:**  
  
* (_Object_) an instance of MqttShepherd

**Examples:**  

```js
var MqttShepherd = require('mqtt-shepherd');

// create a server and name it
var server= new MqttShepherd('my_iot_server');

// create a server that starts on the specified port
var server= new MqttShepherd('my_iot_server', { port: 9000 });

// create a server with other backend (example from Mosca wiki)
var server= new MqttShepherd('my_iot_server', {
    port: 1883,
    backend: {
        type: 'mongo',        
        url: 'mongodb://localhost:27017/mqtt',
        pubsubCollection: 'ascoltatori',
        mongo: {}
    }
});
```
  
<a name="API_start"></a>
### .start([callback])
Start the server.  

**Arguments:**  

1. `callback` (_Function_): Get called after the initializing procedure is done.  

  
**Returns:**  
  
* (_Promise_): promise

**Examples:**  
    
```js
server.start(function () {
    console.log('server initialized.');
});
```

<a name="API_stop"></a>
### .stop([callback])
Stop the server.  

**Arguments:**  

1. `callback` (_Function_): Get called after the server closed.  

  
**Returns:**  
  
* (_Promise_): promise

**Examples:**  
    
```js
server.stop(function () {
    console.log('server stopped.');
});
```

<a name="API_reset"></a>
### .reset([callback])
Restart the server. This is a soft restart, all records of the registered Client Devices remain in the database.

**Arguments:**  

1. `callback` (_Function_): Get called after the server restarted.  

  
**Returns:**  
  
* (_Promise_): promise

**Examples:**  
    
```js
server.reset(function () {
    console.log('server is reset.');
});
```

<a name="API_info"></a>
### .info()
Returns the server infomation.

**Arguments:**  

1. none  

  
**Returns:**  
  
* (_Object_): information about this server

**Examples:**  
    
```js
console.log(server.info());
```

<a name="API_listDevices"></a>
### .listDevices()
List all records of the registered Client Devices.

**Arguments:**  

1. none  

  
**Returns:**  
  
* (_Array_): information of all the Client Devices

**Examples:**  
    
```js
// [TODO] to list something just we need
console.log(server.listDevices());
[ {
    clientId: 'xxxx', ip: 'xxx', mac: 'xxx', lifetime: 12345, version: '', joinTime: xxxx,
    objList: {}
  } ]
```

<a name="API_maintain"></a>
### .maintain([clientId][, callback])
Maintain the server. If clientId is given, only the indicated Client will be freshed. If not given,
all devices will be freshed. (re-discover)

**Arguments:**  

1. `clientId`:  
2. `callback` (_Function_): Get called after the maintenance finished.  

  
**Returns:**  
  
* (_Promise_): promise

**Examples:**  
    
```js
server.maintain();

server.maintain('foo_client_id');
```

<a name="API_findNode"></a>
### .findNode(clientId)
Find the Client Device (qnode) in the server.

**Arguments:**  

1. `clientId`:  

  
**Returns:**  
  
* (_Object_): qnode, a instance of MqttNode class

**Examples:**  
    
```js
var qnode = server.findNode('foo');
```

<a name="API_deregisterNode"></a>
### .deregisterNode(clientId[, callback])
Deregister the Client Device (qnode) from the server.

**Arguments:**  

1. `clientId`:  

  
**Returns:**  
  
* (_Promise_): promise

**Examples:**  
    
```js
var qnode = server.findNode('foo');
```


<a name="API_announce"></a>
### .announce(msg[, callback])
The Server can use this method to announce messages.

**Arguments:**  

1. `msg`:  

  
**Returns:**  
  
* (_Promise_): promise

**Examples:**  
    
```js
server.announce('Rock on!');
```

### Event: 'ready'
`function () { }`
Fired when the Server is ready.

### Event: 'error'
`function (err) { }`
Fired when there is an error occurred.

### Event: 'ind'
`function (type, msg) { }`
Fired when there is an indication coming. There are 5 kinds of `type` fired by the Server, they are `devIncoming`, `devLeaving`, `devUpdate`, `devNotify` and `devChange`. The msg in each type of indication is listed below.

* ##### 'devIncoming'    
    msg (_Object_): a qnode

* ##### 'devLeaving'  
    msg (_String_): the clientId of which Device is leaving

* ##### 'devUpdate'
    msg (_Object_): the updated device attributes, there may be fields of `status`, `lifetime`, `ip`, `version` in this object.

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
            oid: 'humidSensor',
            iid: 0,
            rid: 'sensorValue',
            data: 32
        }

        // example of an Object Instance notification
        {
            oid: 'humidSensor',
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
            oid: 'tempSensor',
            iid: 0,
            data: {
                sensorValue: 12,
                minMeaValue: 12
            }
        }

        // change of a Resource 
        {
            oid: 'tempSensor',
            iid: 1,
            rid: 'sensorValue',
            data: 18
        }
        ```

### Event: 'message'
`function(topic, message, packet) {}`
Emitted when the Server receives a published packet from all channels

1. `topic` (_String_): topic of the received packet
2. `message` (_Buffer_): payload of the received packet
3. `packet` (_Object_): the received packet, as defined in [mqtt-packet](#https://github.com/mqttjs/mqtt-packet#publish)


***********************************************
<br />
## MqttNode Class
Managed device  

<a name="API_dump"></a>
### .dump([callback])
Dump the qnode record.

**Arguments:**  

1. none  

  
**Returns:**  
  
* (_Object_): qnode data

**Examples:**  
    
```js
console.log(server.dump());
```

<a name="API_maintain"></a>
### .maintain([callback])
Maintain the Client Device.

**Arguments:**  

1. `callback` (_Function_): 
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
qnode.maintain(function (err, rsp) {

});
```

<a name="API_readReq"></a>
### .readReq(path[, callback])
Remotely read the target.

**Arguments:**  

1. `path` (_String_): the path of the target

  
**Returns:**  
  
* _none_

**Examples:**  
    
```js
qnode.readReq('tempSensor/1/sensedValue', function (err, rsp) {

});

qnode.readReq('/tempSensor/1/sensedValue', function (err, rsp) {

});

qnode.readReq('/tempSensor/1/sensedValue/', function (err, rsp) {

});
```

<a name="API_writeReq"></a>
### .writeReq(path, data[, callback])
Remotely write a data to  the target.

**Arguments:**  

1. `path` (_String_): the path of the target  
2. `data` (_Depends_): value to write
3. `callback` (_Function_): 
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
qnode.writeReq('digitalOutput/0/appType', 'lightning', function (err, rsp) {

});
```


<a name="API_writeAttrsReq"></a>
### .writeAttrsReq(path, attrs[, callback])
Reporting attrubites

**Arguments:**  

1. `path` (_String_): the path of the target  
2. `attrs` (_Object_): attributes to write
3. `callback` (_Function_): 
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
qnode.writeAttributes('tempSensor/0/sensedValue', {
    pmin: 10,
    pmax: 600,
    gt: 45
}, function (err, rsp) {

});

// This will not start the observation
```


<a name="API_discoverReq"></a>
### .discoverReq(path[, callback])
Discover the reporting attributes of the Client

**Arguments:**  

1. `path` (_String_): the path of the target
2. `callback` (_Function_): 
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
qnode.discoverReq('tempSensor/0/sensedValue', function (err, rsp) {

});
```

<a name="API_executeReq"></a>
### .executeReq(path, args[, callback])
Invoke an excutable Resource on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the target
2. `args` (_Array_): 
3. `callback` (_Function_): 
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js

// assume there in an executable Resource with the singnatue
// function(times) { ... } 
qnode.execReq('myLed/0/blink', [ 10 ] ,function (err, rsp) {

});

// assume there in an executable Resource with the singnatue
// function() { ... } 
qnode.execReq('myLed/0/blink', [ 10 ] ,function (err, rsp) {

});
```

<a name="API_observeReq"></a>
### .observeReq(path[, callback])
Start observing upon a Resource on the Client

**Arguments:**  

1. `path` (_String_): the path of the target
2. `callback` (_Function_): 
  
**Returns:**  
  
* (_none_)

**Examples:**  
    
```js
qnode.observeReq('tempSensor/0/sensedValue', function (err, rsp) {

});
```

<a name="Encryption"></a>
## 6. Message Encryption
By default, the Sever won't encrypt the message. You can override the encrypt() and decrypt() methods to create your own encryption and decryption. You should implement the methods of encrypt() and decrypt() at the Client Device as well.


* [server.encrypt()](#method_encrypt)
* [sever.decrypt()](#method_decrypt)

<a name="APIs"></a>
## 5. APIs

