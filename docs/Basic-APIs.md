## Basic APIs

LwmqnShepherd is being exposed by `require('lwmqn-shepherd')`

* This class brings you a LwMQN Server with network managing facilities, i.e., permission of device joining, device authentication, reading resources, writing resources, observing resources, and executing procedures on remote devices. This document uses `qserver` to denote the instance of this class.
* Each asynchronous API supports both callback style and promise backed by [q](https://github.com/kriskowal/q) 1.4.x.

********************************************
### new LwmqnShepherd([name,] [settings])
Create a server instance of the `LwmqnShepherd` class. This document will use `qserver` to denote the server.

**Arguments:**

1. `name` (_String_): Server name. A default name `'lwmqn-shepherd'` will be used if not given.
2. `settings` (_Object_): Optional settings for qserver.

    | Property       | Type    | Description                                                                                                                                                                         |
    |----------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | broker         | Object  | Broker settings in shape of `{ port, backend }`, where backend is a `pubsubsettings` object given in [Mosca wiki page](https://github.com/mcollina/mosca/wiki/Mosca-advanced-usage). You can set up your own MQTT backend, like mongoDB, Redis, Mosquitto, or RabbitMQ, through this option. |
    | account        | Object  | Set default account with a `{ username, password }` object, where username and password are strings. Default is `null` to accept all incoming Clients.                               |
    | reqTimeout     | Number  | Number of milliseconds, a global timeout for all requests.                                                                                                                          |
    | dbPath         | String  | Set database file path, default is `__dirname + '/database/mqtt.db'`.                                                                                                                |

**Returns:**

* (_Object_): qserver

**Examples:**

* Create a server and name it

```js
const Shepherd = require('lwmqn-shepherd')
const qserver = new Shepherd('my_iot_server')
```

* Create a server that starts on a specified port

```js
const qserver = new Shepherd('my_iot_server', {
  broker: {
    port: 9000
  }
})
```

* Create a server with other backend ([example from Mosca wiki](https://github.com/mcollina/mosca/wiki/Mosca-advanced-usage#--mongodb))

```js
const qserver = new Shepherd('my_iot_server', {
  broker: {
    port: 1883,
    backend: { // backend is the pubsubsettings seen in Mosca wiki page
      type: 'mongo',
      url: 'mongodb://localhost:27017/mqtt',
      pubsubCollection: 'ascoltatori',
      mongo: {}
    }
  }
})
```

* Create a server with a default account. Only Clients connecting with this account is authenticated if you don't have an authentication subsystem.

```js
const qserver = new Shepherd('my_iot_server', {
  account: {
    username: 'skynyrd',
    password: 'lynyrd'
  }
})
```

********************************************
### .start([callback])
Start qserver.

**Arguments:**

1. `callback` (_Function_): `function (err) { }`. Get called after the initializing procedure is done.


**Returns:**

* (_Promise_): promise

**Examples:**

```js
// callback style
qserver.start(function (err) {
  if (!err) console.log('server initialized.')
})

// promise style
qserver.start().then(function () {
  console.log('server initialized.')
}).done()
```

********************************************
### .stop([callback])
Stop qserver.

**Arguments:**

1. `callback` (_Function_): `function (err) { }`. Get called after the server closed.


**Returns:**

* (_Promise_): promise

**Examples:**

```js
qserver.stop(function (err) {
  if (!err) console.log('server stopped.')
})
```

********************************************
### .reset([mode,] [callback])
Reset qserver. After qserver restarted, a `'ready'` event will be fired. A hard reset (`mode == true`) will clear all joined qnodes in the database.

**Arguments:**

1. `mode` (_Boolean_): `true` for a hard reset, and `false` for a soft reset. Default is `false`.
1. `callback` (_Function_): `function (err) { }`. Get called after the server restarted.

**Returns:**

* (_Promise_): promise

**Examples:**

```js
qserver.on('ready', function () {
  console.log('server is ready')
})

// default is soft reset
qserver.reset(function (err) {
  if (!err) console.log('server restarted.')
})

// hard reset
qserver.reset(true, function (err) {
  if (!err) console.log('server restarted.')
})
```

********************************************
### .permitJoin(time)
Allow or disallow devices to join the network. A 'permitJoining` event will be fired every tick of countdown (per second) when qserver is allowing device to join its network.


**Arguments:**

1. `time` (_Number_): Time in seconds for qserver allowing devices to join the network. Set `time` to `0` can immediately close the admission.

**Returns:**

* (_Boolean_): `true` for a success, otherwise `false` if qserver is not enabled.

**Examples:**

```js
qserver.on('permitJoining', function (joinTimeLeft) {
  console.log(joinTimeLeft)
})

// allow devices to join for 180 seconds, this will also trigger
// a 'permitJoining' event at each tick of countdown.
qserver.permitJoin(180) // true
```

********************************************
### .info()
Returns qserver information.

**Arguments:**

1. none

**Returns:**

* (_Object_): An object that contains information about the server. Properties in this object are given in the following table.

    | Property       | Type    | Description                                                    |
    |----------------|---------|----------------------------------------------------------------|
    | name           | String  | Server name                                                    |
    | enabled        | Boolean | Server is up(`true`) or down(`false`)                          |
    | net            | Object  | Network information, `{ intf, ip, mac, routerIp }`             |
    | devNum         | Number  | Number of devices managed by this qserver                      |
    | startTime      | Number  | Unix Time (secs from 1970/1/1)                                 |
    | joinTimeLeft   | Number  | How many seconds left for allowing devices to join the Network |

**Examples:**

```js
qserver.info()

/*
{
    name: 'my_iot_server',
    enabled: true,
    net: {
        intf: 'eth0',
        ip: '192.168.1.99',
        mac: '00:0c:29:6b:fe:e7',
        routerIp: '192.168.1.1'
    },
    devNum: 36,
    startTime: 1454419506,
    joinTimeLeft: 28
}
*/
```

********************************************
### .list([clientIds])
List records of the registered qnode(s). This method always returns an array.

**Arguments:**

1. `clientIds` (_String_ | _String[]_): A single client id or an array of client ids to query for their records. All device records will be returned if `clientIds` is not given.

**Returns:**

* (_Array_): Information of qnodes. Each record in the array is an object with the properties shown in the following table. An element in the array will be `undefined` if the corresponding qnode is not found.

    | Property     | Type    | Description                                                                                                                     |
    |--------------|---------|---------------------------------------------------------------------------------------------------------------------------------|
    | clientId     | String  | Client id of the qnode                                                                                                          |
    | joinTime     | Number  | Unix Time (secs). When a qnode joined the network.                                                                              |
    | lifetime     | Number  | Lifetime of the qnode. If there is no message coming from the qnode within lifetime, qserve will deregister this qnode          |
    | ip           | String  | Ip address of qserver                                                                                                           |
    | mac          | String  | Mac address                                                                                                                     |
    | version      | String  | LWMQN version                                                                                                                   |
    | objList      | Object  | IPSO _Objects_ and _Object Instances_. Each key in `objList` is the `oid` and each value is an array of `iid` under that `oid`. |
    | status       | String  | `'online'`, `'offline'`, or `'sleep'`                                                                                           |

**Examples:**

```js
console.log(qserver.list(['foo_id', 'bar_id', 'no_such_id']))

/*
[
    {
        clientId: 'foo_id',          // record for 'foo_id'
        joinTime: 1454419506,
        lifetime: 12345,
        ip: '192.168.1.112',
        mac: 'd8:fe:e3:e5:9f:3b',
        version: '',
        objList: {
            3: [ 1, 2, 3 ],
            2205: [ 7, 5503 ]
        },
        status: 'online'
    },
    {
        clientId: 'bar_id',          // record for 'bar_id'
        joinTime: 1454419706,
        lifetime: 12345,
        ip: '192.168.1.113',
        mac: '9c:d6:43:01:7e:c7',
        version: '',
        objList: {
            3: [ 1, 2, 3 ],
            2205: [ 7, 5503 ]
        },
        status: 'sleep',
    },
    undefined                        // record not found for 'no_such_id'
]
*/

console.log(qserver.list('foo_id'))

/* An array will be returned even a single string is argumented.
[
    {
        clientId: 'foo_id',          // record for 'foo_id'
        joinTime: 1454419506,
        lifetime: 12345,
        ip: '192.168.1.112',
        mac: 'd8:fe:e3:e5:9f:3b',
        version: '',
        objList: {
            3: [ 1, 2, 3 ],
            2205: [ 7, 5503 ]
        },
        status: 'online'
    }
]
*/
```

********************************************
### .find(clientId)
Find a registered qnode on qserver by clientId.

**Arguments:**

1. `clientId` (_String_): Client id of the qnode to find for.


**Returns:**

* (_Object_): qnode. Returns `undefined` if not found.

**Examples:**

```js
const qnode = qserver.find('foo_id')

if (qnode) {
  // do something upon the qnode, like qnode.readReq()
}
```

********************************************
### .findByMac(macAddr)
Find registered **qnodes** by the specified mac address. This method always returns an array, because there may be many qnodes living in the same machine to share the same mac address.

**Arguments:**

1. `macAddr` (_String_): Mac address of the qnode(s) to find for. The address is **_case-insensitive_**.


**Returns:**

* (_qnode[]_): Array of found qnodes. Returns an empty array if not found.

**Examples:**

```js
const qnodes = qserver.findByMac('9e:65:f9:0b:24:b8')

if (qnodes.length) {
  // do something upon the qnodes
}
```

********************************************
### .remove(clientId[, callback])
Deregister and remove a qnode from the network by its clientId.

**Arguments:**

1. `clientId` (_String_): Client id of the qnode to be removed.
2. `callback` (_Function_): `function (err, clientId) { ... }` will be called after removal. `clientId` is client id of the removed qnode.

**Returns:**

* (_Promise_): promise

**Examples:**

```js
qserver.remove('foo', function (err, clientId) {
  if (!err) console.log(clientId)
})
```

********************************************
### .announce(msg[, callback])
The qserver can use this method to announce(/broadcast) any message to all qnodes.

**Arguments:**

1. `msg` (_String_ | _Buffer_): The message to announce. Remember to stringify if the message is a data object.
2. `callback` (_Function_): `function (err) { ... }`. Get called after message announced.

**Returns:**

* (_Promise_): promise

**Examples:**

```js
qserver.announce('Rock on!')
```
