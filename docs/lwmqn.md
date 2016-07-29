# LWMQN - **L**ight**W**eight **MQ**TT Machine *N*etwork
  

Lightweight MQTT machine network (LWMQN) is an architecture that follows part of [OMA LWM2M v1.0 specification](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) to meet the minimum requirements of MQTT machine network management. LWMQN aims to build applications of a small-area machine network in a fast and easy way.  
This document describes the communication interfaces and message formats in LWMQN Client/Server model. The differences between LWMQN and LWM2M specifications will also be noted in this document.  

<a name="Machine"></a>
## 1. Machine Management

For IoT applications, there are many communication protocols, such as CoAP and MQTT for resource constrained devices, can be adopted for transportation to make machines talk to each other. Establishing communication among machines is easy, but adequately managing them may be not. How do I know when a machine joins the network? When a machine leaves from the network? What kind of a machine is, it’s a light bulb, a switch, a temperature sensor, or what? How to manage notifications from them? And how to authenticate whether a machine has rights to join the network?  
  
The Open Mobile Alliance (OMA) defines an application layer protocol of Client/Server architecture to meet the needs of machine network management. This architecture is well-known as **_LWM2M_** which is the specification of device management for a lightweight machine to machine network. In addition, LWM2M adopts an unified data model, called ip-based smart objects, defined by IPSO Alliance. In a LWM2M network, device(/machine) acts as a Client and the LWM2M service running on a platform acts as a Server.  
  
LWMQN is similar to but lighter than LWM2M. The main difference between them is that "_LWM2M is defined on top of CoAP protocol, and LWMQN implements the device management architecture based on MQTT_". In addition, LWMQN doesn't have the Bootstrap interface and service. LWMQN uses a simple procedure of account authentication for developers to define their own account on both Client-side and Server-side. The `mqtt-shepherd` module, which is an implementation of the LWMQN Server on node.js, provides developers with an overridable authenticating method for more complicated authentication. Another difference between them is that LWMQN does not support create and delete operations upon Smart Objects at runtime. This is for simplicity and security reasons.  


<a name="Interfaces"></a>
## 2. Interfaces

LWM2M defines four interfaces for Client/Server communications:  

* Bootstrap
    - This interface is responsible for authentication process.  
* Client Registration
    - This is the registration/deregistration procedure for a Client to join or to leave from the machine network.  
* Device Management and Service Enablement  
    - This interface defines operations of read, discover, write, write attributes, execute, create and delete applying to a Client Device.  
* Information Reporting  
    - Observe and notify are the operations related to the reporting interface. The Server uses the observe operation to ask the Client Device to report the changes of the targeting resource. The Client uses the notify operation to report the changes of the targeted resource to the Server.  

<a name="Libraries"></a>
## 3. Libraries [TODO]

The LWMQN project delivers

The `mqtt-shepherd` is an implementation of LWMQN Server and the `mqtt-node` is an implementation of LWMQN Client on node.js.  

The `mqtt-shepherd` and `mqtt-node` are working together as an application framework of machine network. They have done a lot of things for you, such as auto registration, deregistration on lifetime expiration, update of device attributes, notifications of changes, .etc. At Client Device, all you have to do in this framework is to declare your IPSO data model. At Server-side, there are some events will be fired to let you know when a device is incoming, when a device is leaving, and when a Resource is changed. `mqtt-shepherd` also provides you with few handy APIs to read resource remotely from the Client Device, to write value to a Resource on the Client Device, .etc. Please see the API documents of them for more details.  

<a name="Channels"></a>
## 4. Channels  

LWMQN implements the Client/Server interaction interfaces based on MQTT _topics_, and such special topics are named as _channels_ to distinguish from general topics. Message in each channel is simply a serialized JSON string of a messaging object. The following table gives the description of each channel.  
The request/response channels are working together for the Server to send requests to and receive responses from a Client. These requests are commands, such as read, discover, write attributes, execute, and observe, to perform upon the Client.
The Server can broadcast information through the announce channel to all Clients in the network. One can use this channel to broadcast his/her own messages to help network management, e.g., announce a server shunt down message to inform all Clients in the network.

| Channel     | Description                                                       | Interface             |
|-------------|-------------------------------------------------------------------|-----------------------|
| register    | For a Client to register to a Server                              | Client Registration   |
| deregister  | For a Client to deregister from a Server                          | Client Registration   |
| update      | For a Client to update its registration information to the Server | Device Management     |
| ping        | For a Client to ping the Server                                   | Device Management     |
| announce    | For the Server to announce something to all Clients               | Device Management     |
| request     |                                                                   | Device Management     |
| response    |                                                                   | Device Management     |
| notify      |                                                                   | Information Reporting |

| Channel     | Topic: Client Pub / Server Sub | Topic: Client Sub / Server Pub  |
|-------------|--------------------------------|---------------------------------|
| register    | register/${clientId}           | register/response/${clientId}   |
| deregister  | deregister/${clientId}         | deregister/response/${clientId} |
| update      | update/${clientId}             | update/response/${clientId}     |
| ping        | ping/${clientId}               | ping/response/${clientId}       |
| announce    | -                              | announce                        |
| request     | -                              | request/${clientId}             |
| response    | response/${clientId}           | -                               |
| notify      | notify/${clientId}             | notify/response/${clientId}     |

| Channel     | Client to Server                                   | Server to Client                          |
|-------------|----------------------------------------------------|-------------------------------------------|
| register    | `{ transId, lifetime, ip, mac, version, objList }` | `{ transId, status }`                     |
| deregister  | `{ transId }`                                      | `{ transId, status }`                     |
| update      | `{ lifetime, ip, version, objList }`               | `{ status }`                              |
| ping        | `{ transId }`                                      | `{ status }`                              |
| announce    | Depends on implementation                          | Depends on implementation                 |
| request     | -                                                  | `{ transId, cmdId, oid, iid, rid, data }` |
| response    | `{ transId, cmdId, status, data }`                 | -                                         |
| notify      | `{ oid, iid, rid, data }`                          | `{ status }`                              |

* Client Publication and Server Subscription

| Channel     | Topic                  | Message Object Client Published/Server Received    |
|-------------|------------------------|----------------------------------------------------|
| register    | register/${clientId}   | `{ transId, lifetime, ip, mac, version, objList }` |
| deregister  | deregister/${clientId} | `{ transId }`                                      |
| update      | update/${clientId}     | `{ lifetime, ip, version, objList }`               |
| ping        | ping/${clientId}       | `{ transId }`                                      |
| announce    | -                      | -                                                  |
| request     | -                      | -                                                  |
| response    | response/${clientId}   | `{ transId, cmdId, status, data }`                 |
| notify      | notify/${clientId}     | `{ oid, iid, rid, data }`                          |

* Client Subscription and Server Publication

| Channel     | Topic                           | Message Object Client Received/Server Published |
|-------------|---------------------------------|-------------------------------------------------|
| register    | register/response/${clientId}   | `{ transId, status }`                           |
| deregister  | deregister/response/${clientId} | `{ transId, status }`                           |
| update      | update/response/${clientId}     | `{ status }`                                    |
| ping        | ping/response/${clientId}       | `{ status }`                                    |
| announce    | announce                        | Depends on implementation                       |
| request     | request/${clientId}             | `{ transId, cmdId, oid, iid, rid, data }`       |
| response    | -                               | -                                               |
| notify      | notify/response/${clientId}     | `{ status }`                                    |


| Command    | Description                                                       | Description           |
|------------|-------------------------------------------------------------------|-----------------------|
| read       | For a Client to register to a Server                              | Client Registration   |
| discover   | For a Client to deregister from a Server                          | Client Registration   |
| write      | For a Client to update its registration information to the Server | Device Management     |
| writeAttrs | For a Client to ping the Server                                   | Device Management     |
| execute    | For the Server to announce something to all Clients               | Device Management     |
| observe    |                                                                   | Device Management     |
| ping       |                                                                   | Device Management     |

### 4.1 Register  

> A Client uses this channel to ask for joining the network.  

The Server will send a status code of 201(Created) or 200(OK) to the Client with a success of registering procedure. Code 200 means that the Client was registered before and the record is successfully renewed on the Server. Code 201 indicates that this is a whole new Client. If there is a duplicate Client exists (`clientId` conflicts), the Server will send 409(Conflict) to the Client. Finally, the Server sends 500(Internal Server Error) to the Client if any unpredictable error occurs on the Server, such as database creation fails. The Error Code is given in section Error Codes.  

* Message from Client to Server  
    - `{ transId, lifetime, ip, mac, version, objList }`

| Filed    | Type     | Mandatory | Note                                                                                                                                                                             |
|----------|----------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| transId  | Number   | Required  | The Client should assign an id for identifying the Request/Response transaction.                                                                                                 |
| lifetime | Number   | Optional  | If a Client does not publish an update within this lifetime, its registration will be removed from the Server. The default value 86400 will be used if not given. Unit: seconds. |
| ip       | String   | Required  | Client ip address                                                                                                                                                                |
| mac      | String   | Required  | Client mac address                                                                                                                                                               |
| version  | String   | Optional  | Minimum supported LWMQN version                                                                                                                                                  |
| objList  | Object[] | Required  | This list reveals the supported Objects and available Object Instances on the Client.                                                                                            |

    - objList
        - It is an array of paired oid-iid objects: `[ { oid: 1, iid: 101 }, { oid: 1, iid: 102 }, { oid: 2, iid: 0 }, { oid: 2, iid: 1 } ]`. The type of oid and iid can be either Number or String. The oid will be parsed to see if it is an LWM2M-defined or IPSO-defined identifier. If not, it should be regarded as a custom identifier. This means that you should not use an id already defined publically if you like to use your own private ids. The public Object Id is unique and you can find the list from here.  

    - example

```js
{
    transId: 20,
    lifetime: 12400,
    ip: '192.168.0.121',
    mac: '3c:df:ab:61:2e:03',
    version: '0.0.1',
    objList: [
        { oid: 1, iid: 101 },
        { oid: 1, iid: 102 },
        { oid: 2, iid: 0 },
        { oid: 2, iid: 1 }
    ]
}
```

* Message from Server to Client  
    - `{ transId, status }`

| Filed    | Type     | Mandatory | Note                                                                |
|----------|----------|-----------|---------------------------------------------------------------------|
| transId  | Number   | Required  | Request/Response transaction identifier                             |
| status   | Number   | Required  | 200 (OK), 201 (Created), 409 (Conflict), 500 (InternalServerError)  |

    - example

```js
{
    transId: 20,
    status: 200
}
```

### 4.2 Deregister  

> When a Client wants to be no longer available to Server, the Client can use this channel to ask the Server for leaving from the network.  

Upon receiving the message in this channel, the Server removes the Client from the registry and returns 200 to the Client when succeeds. Status 404 will be returned if the Client is not found on the Server. If the Client has no activities during the `lifetime`, the Server will automatically deregister the Client on expiration.  

* Message from Client to Server  
    - `{ transId, lifetime, ip, mac, version, objList }`

| Filed    | Type     | Mandatory | Note                                                                                |
|----------|----------|-----------|-------------------------------------------------------------------------------------|
| transId  | Number   | Required  | The Client should assign an id for identifying the Request/Response transaction.    |

    - example

```js
{
    transId: 21
}
```

* Message from Server to Client  
    - `{ transId, status }`

| Filed    | Type     | Mandatory | Note                                                                |
|----------|----------|-----------|---------------------------------------------------------------------|
| transId  | Number   | Required  | Request/Response transaction identifier                             |
| status   | Number   | Required  | 202 (Deleted), 404 (NotFound)                                       |

    - example

```js
{
    transId: 21,
    status: 202
}
```

### 4.3 Update  

> Client updates its registered information via this channel when the Device basic information changes, e.g. ip address changes.  

* Only the changes of lifetime, ip, version, and objList are accepted and the Client should provide at least one parameter of them when it updates. The change of the mac address is not allowed.  
* The Server returns 204 when it successfully updates the registry. The Server returns 409 to Client if the Client is trying to change its mac address. If changing of mac address is necessary, the Client has to deregister from the Server and re-register itself to the Server again.  
* If there is an unknown parameter specified, the Server will return 400 to notice the Client that this is a bad request. The Server will return 404 if the Client does not exist in the registry. If any unpredictable error occurs on the Server, it will return 500 back to the Client.  
* Note that if the objList is given when Client updates, the Server will clear the Client Objects in the registry and remotely re-discover all Objects on the Client to rebuild the Client Objects in the registry. Therefore, once the objList is given, the list should be a full list that describes all objects and their instances on the Client Device. That is, the objList cannot be partially updated.  
* The Client can perform the update operation periodically or base on certain events. Besides, the Server can also initiate an update operation by requesting an execute operation on “Registration Update Trigger” resource of the Server Object within the Client Device. [TBD]  

* Message from Client to Server  
    - `{ transId, lifetime, ip, mac, version, objList }`

| Filed    | Type     | Mandatory | Note                                                                                                                                                                             |
|----------|----------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| transId  | Number   | Required  | The Client should assign an id for identifying the Request/Response transaction.                                                                                                 |
| lifetime | Number   | Optional  | If a Client does not publish an update within this lifetime, its registration will be removed from the Server. The default value 86400 will be used if not given. Unit: seconds. |
| ip       | String   | Optional  | Client ip address                                                                                                                                                                |
| version  | String   | Optional  | Minimum supported LWMQN version                                                                                                                                                  |
| objList  | Object[] | Optional  | This list reveals the supported Objects and available Object Instances on the Client.                                                                                            |

    - example

```js
{
    transId: 96,
    lifetime: 6200,
}
```

* Message from Server to Client  
    - `{ transId, status }`

| Filed    | Type     | Mandatory | Note                                                                                     |
|----------|----------|-----------|------------------------------------------------------------------------------------------|
| transId  | Number   | Required  | Request/Response transaction identifier                                                  |
| status   | Number   | Required  | 204 (Changed), 400 (BadRequest), 404 (NotFound), 409(Conflict), 500(InternalServerError) |

    - example

```js
{
    transId: 96,
    status: 200
}
```

### 4.4 Read  

> The Sever uses this channel to remotely access the value of a Resource, an Object Instance, or all Object Instances of an Object.  

* When the read operation succeeds, the Client will return the status code of 205 along with the allocated target which can be a Resource, Object Instance, or all Object Instances of an Object. If the allocated target does not exist, the Client will return 404. If the allocated target is unreadable, then the Client will return 405.  
* Note that when an unreadable Resource is read, the returned value will be flagged as a string '_unreadble_'. When a Resource has type of `Exec` (executable), the returned value will then be flagged as '_exec_'. This behavior differs from the LWM2M specification, the LWM2M Client won’t send back the value of a Resource that is unreadable or executable, but the LWMQN will do.  


* Message from Client to Server  
    - `{ transId, lifetime, ip, mac, version, objList }`

| Filed    | Type     | Mandatory | Note                                                                                                                                                                             |
|----------|----------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| transId  | Number   | Required  | The Client should assign an id for identifying the Request/Response transaction.                                                                                                 |
| lifetime | Number   | Optional  | If a Client does not publish an update within this lifetime, its registration will be removed from the Server. The default value 86400 will be used if not given. Unit: seconds. |
| ip       | String   | Optional  | Client ip address                                                                                                                                                                |
| version  | String   | Optional  | Minimum supported LWMQN version                                                                                                                                                  |
| objList  | Object[] | Optional  | This list reveals the supported Objects and available Object Instances on the Client.                                                                                            |

    - example

```js
{
    transId: 96,
    lifetime: 6200,
}
```
