## Events

********************************************
### Event: 'ready'
**Listener**: `function () { }`
Fired when qserver is ready.


********************************************
### Event: 'error'
**Listener**: `function (err) { }`
Fired when there is an error occurs.


********************************************
### Event: 'permitJoining'
**Listener**: `function (joinTimeLeft) {}`
Fired when qserver is allowing for devices to join the network, where `joinTimeLeft` is number of seconds left to allow devices to join the network. This event will be triggered at each tick of countdown (per second).


********************************************
### Event: 'ind'
**Listener**: `function (msg) { }`
Fired when there is an incoming indication message. The `msg` is an object with the properties given in the table:

| Property       | Type             | Description                                                                                                                     |
|----------------|------------------|---------------------------------------------------------------------------------------------------------------------------------|
| type           | String           | Indication type, can be `'devIncoming'`, `'devLeaving'`, `'devUpdate'`, `'devNotify'`, `'devChange'`, and `'devStatus'`.        |
| qnode          | Object \| String | qnode instance, except that when `type === 'devLeaving'`, qnode will be a clientId (since qnode has been removed)               |
| data           | Depends          | Data along with the indication, which depends on the type of indication                                                         |


* ##### devIncoming
    Fired when there is a qnode incoming to the network. The qnode can be either a new registered one or an old one that logs in again.

    * msg.type: `'devIncoming'`
    * msg.qnode: `qnode`
    * msg.data: `undefined`
    * message examples
    ```js
    // example of an Object Instance notification
    {
        type: 'devIncoming',
        qnode: qnode instance
    }
    ```

* ##### devLeaving
    Fired when there is a qnode leaving the network.

    * msg.type: `'devLeaving'`
    * msg.qnode: `'foo_clientId'`, the clientId of which qnode is leaving
    * msg.data: `9e:65:f9:0b:24:b8`, the mac address of which qnode is leaving.
    * message examples
    ```js
    // example of an Object Instance notification
    {
        type: 'devLeaving',
        qnode: 'foo_clientId',
        data: '9e:65:f9:0b:24:b8'
    }
    ```

* ##### devUpdate
    Fired when there is a qnode that publishes an update of its device attribute(s).

    * msg.type: `'devUpdate'`
    * msg.qnode: `qnode`
    * msg.data: An object that contains the updated attribute(s). There may be fields of `status`, `lifetime`, `ip`, and `version` in this object.
    * message examples
    ```js
    // example of an Object Instance notification
    {
        type: 'devUpdate',
        qnode: qnode instance,
        data: {
            ip: '192.168.0.36',
            lifetime: 82000
        }
    }
    ```

* ##### devNotify
    Fired when there is qnode that publishes a notification of its _Object Instance_ or _Resource_.

    * msg.type: `'devNotify'`
    * msg.qnode: `qnode`
    * msg.data: Content of the notification. This object has fields of `oid`, `iid`, `rid`, and `data`.
        - `data` is an _Object Instance_ if `oid` and `iid` are given but `rid` is null or undefined
        - `data` is a _Resource_ if `oid`, `iid` and `rid` are given (data type depends on the _Resource_)
    * message examples
    ```js
    // example of an Object Instance notification
    {
        type: 'devNotify',
        qnode: qnode instance,
        data: {
            oid: 'humidity',
            iid: 0,
            data: {             // Object Instance
                sensorValue: 32
            }
        }
    }

    // example of a Resource notification
    {
        type: 'devNotify',
        qnode: qnode instance,
        data: {
            oid: 'humidity',
            iid: 0,
            rid: 'sensorValue',
            data: 32            // Resource value
        }
    }
    ```

* ##### devChange
    Fired when the Server perceives that there is any change of _Resources_ from notifications or read/write responses.

    * msg.type: `'devChange'`
    * msg.qnode: `qnode`
    * msg.data: Content of the changes. This object has fields of `oid`, `iid`, `rid`, and `data`.
        - `data` is an object that contains only the properties changed in an Object Instance. In this case, `oid` and `iid` are given but `rid` is null or undefined
        - `data` is the new value of a Resource. If a Resource itself is an object, then `data` will be an object that contains only the properties changed in that Resource. In this case, `oid`, `iid` and `rid` are given (data type depends on the Resource)
    * message examples
    ```js
    // changes of an Object Instance
    {
        type: 'devChange',
        qnode: qnode instance,
        data: {
            oid: 'temperature',
            iid: 0,
            data: {
                sensorValue: 12,
                minMeaValue: 12
            }
        }
    }

    // change of a Resource
    {
        type: 'devChange',
        qnode: qnode instance,
        data: {
            oid: 'temperature',
            iid: 1,
            rid: 'sensorValue',
            data: 18
        }
    }
    ```

    * **Notice!!!** The difference between `'devChange'` and `'devNotify'`:
        - Data along with `'devNotify'` is what a qnode like to notify of even if there is nothing changed. A periodical notification is a good example, a qnode has to report something under observation even there is no change of that thing.
        - If qserver does notice there is really something changed, it will then fire `'devChange'` to report the change(s). It is suggested to use `'devChange'` indication to update your GUI views, and to use `'devNotify'` indication to log data.

* ##### devStatus
    Fired when there is a qnode going online, going offline, or going to sleep.

    * msg.type: `'devStatus'`
    * msg.qnode: `qnode`
    * msg.data: `'online'`, `'sleep'`, or `'offline'`
    * message examples
    ```js
    // example of an Object Instance notification
    {
        type: 'devStatus',
        qnode: qnode instance,
        data: 'online'
    }
    ```

********************************************
### Event: 'message'
**Listener**: `function(topic, message, packet) {}`
Fired when the qserver receives any published packet from any remote qnode.

1. `topic` (_String_): topic of the received packet
2. `message` (_Buffer_): payload of the received packet
3. `packet` (_Object_): the received packet, as defined in [mqtt-packet](https://github.com/mqttjs/mqtt-packet#publish)
