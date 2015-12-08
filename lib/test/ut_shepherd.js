var should = require('should'),
    _ = require('lodash'),
    MqttNode = require('../mqtt-node'),
    config = require('../config/config.js'),
    MShepherd = require('../mqtt-shepherd');

describe('Constructor Check', function () {
    it('MqttNode(name, settings)', function () {
        var shepherd = new MShepherd('mqshepherd');
        should(shepherd._nodebox).be.eql({});
        should(shepherd._rspsToResolve).be.eql({});
        should(shepherd._joinable).be.false();
        should(shepherd._enabled).be.false();
        should(shepherd._permitJoinTime).be.eql(0);
        should(shepherd.clientId).be.eql('mqshepherd');
        should(shepherd.brokerSettings).be.equal(config.brokerSettings);
        should(shepherd.mBroker).be.null();
        should(shepherd.mClient).be.null();

        should(shepherd.authPolicy.authenticate).be.Function();
        should(shepherd.authPolicy.authorizeSubscribe).be.Function();
        should(shepherd.authPolicy.authorizeForward).be.Function();

        should(shepherd.priphConnected).be.Function();
        should(shepherd.priphDisconnected).be.Function();
        should(shepherd.priphPublished).be.Function();
        should(shepherd.priphSubscribed).be.Function();
        should(shepherd.priphUnsubscribed).be.Function();
        should(shepherd.permitJoin).be.Function();
        should(shepherd.nextTransId).be.Function();

        // for (var i = 0; i < 288; i++) {
        //     console.log(shepherd.nextTransId());
        // }
    });
});

